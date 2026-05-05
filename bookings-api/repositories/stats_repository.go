package repositories

import (
	"context"
	"fmt"
	"time"

	"bookings-api/domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type StatsRepository interface {
	GetFinanceStats(ctx context.Context, period string) (*domain.StatsResponse, error)
	GetAllPaidBookings(ctx context.Context) ([]PaymentRecord, error)
}

type statsRepository struct {
	collection *mongo.Collection
}

func NewStatsRepository(collection *mongo.Collection) StatsRepository {
	return &statsRepository{collection: collection}
}

func (r *statsRepository) GetFinanceStats(ctx context.Context, period string) (*domain.StatsResponse, error) {
	var since time.Time
	now := time.Now().UTC()

	switch period {
	case "weekly":
		since = now.AddDate(0, 0, -84) // 12 weeks back
	case "annual":
		since = time.Time{} // all time
	default: // monthly
		since = now.AddDate(-1, 0, 0) // 12 months back
	}

	// ── Summary: totals across ALL pagado bookings (not limited to period) ──
	summaryPipeline := bson.A{
		bson.M{"$match": bson.M{"status": "pagado"}},
		bson.M{"$group": bson.M{
			"_id":         nil,
			"revenue_ars": bson.M{"$sum": "$total_price"},
			"revenue_usd": bson.M{"$sum": "$usd_amount"},
			"count":       bson.M{"$sum": 1},
		}},
	}

	sumCursor, err := r.collection.Aggregate(ctx, summaryPipeline)
	if err != nil {
		return nil, err
	}
	defer sumCursor.Close(ctx)

	var summaryRaw []struct {
		RevenueARS float64 `bson:"revenue_ars"`
		RevenueUSD float64 `bson:"revenue_usd"`
		Count      int64   `bson:"count"`
	}
	if err := sumCursor.All(ctx, &summaryRaw); err != nil {
		return nil, err
	}

	summary := domain.StatsSummary{}
	if len(summaryRaw) > 0 {
		s := summaryRaw[0]
		summary.TotalRevenueARS = s.RevenueARS
		summary.TotalRevenueUSD = s.RevenueUSD
		summary.TotalPaidBookings = s.Count
		if s.Count > 0 {
			summary.AvgBookingARS = s.RevenueARS / float64(s.Count)
			summary.AvgBookingUSD = s.RevenueUSD / float64(s.Count)
		}
	}

	// ── Breakdown: grouped by period ──
	matchStage := bson.M{"status": "pagado"}
	if !since.IsZero() {
		matchStage["paid_at"] = bson.M{"$gte": since}
	}

	var groupID bson.M
	var sortStage bson.D

	switch period {
	case "weekly":
		groupID = bson.M{
			"year": bson.M{"$isoWeekYear": "$paid_at"},
			"week": bson.M{"$isoWeek": "$paid_at"},
		}
		sortStage = bson.D{{Key: "_id.year", Value: 1}, {Key: "_id.week", Value: 1}}
	case "annual":
		groupID = bson.M{
			"year": bson.M{"$year": "$paid_at"},
		}
		sortStage = bson.D{{Key: "_id.year", Value: 1}}
	default: // monthly
		groupID = bson.M{
			"year":  bson.M{"$year": "$paid_at"},
			"month": bson.M{"$month": "$paid_at"},
		}
		sortStage = bson.D{{Key: "_id.year", Value: 1}, {Key: "_id.month", Value: 1}}
	}

	breakdownPipeline := bson.A{
		bson.M{"$match": matchStage},
		bson.M{"$group": bson.M{
			"_id":         groupID,
			"revenue_ars": bson.M{"$sum": "$total_price"},
			"revenue_usd": bson.M{"$sum": "$usd_amount"},
			"count":       bson.M{"$sum": 1},
		}},
		bson.M{"$sort": sortStage},
	}

	brkCursor, err := r.collection.Aggregate(ctx, breakdownPipeline)
	if err != nil {
		return nil, err
	}
	defer brkCursor.Close(ctx)

	var rawBreakdown []struct {
		ID struct {
			Year  int `bson:"year"`
			Month int `bson:"month"`
			Week  int `bson:"week"`
		} `bson:"_id"`
		RevenueARS float64 `bson:"revenue_ars"`
		RevenueUSD float64 `bson:"revenue_usd"`
		Count      int64   `bson:"count"`
	}
	if err := brkCursor.All(ctx, &rawBreakdown); err != nil {
		return nil, err
	}

	months := []string{"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"}

	breakdown := make([]domain.StatsBreakdownItem, 0, len(rawBreakdown))
	for _, item := range rawBreakdown {
		var label string
		switch period {
		case "weekly":
			label = fmt.Sprintf("Semana %d/%d", item.ID.Week, item.ID.Year)
		case "annual":
			label = fmt.Sprintf("%d", item.ID.Year)
		default:
			if item.ID.Month >= 1 && item.ID.Month <= 12 {
				label = fmt.Sprintf("%s %d", months[item.ID.Month-1], item.ID.Year)
			} else {
				label = fmt.Sprintf("%d/%d", item.ID.Month, item.ID.Year)
			}
		}
		breakdown = append(breakdown, domain.StatsBreakdownItem{
			Label:         label,
			RevenueARS:    item.RevenueARS,
			RevenueUSD:    item.RevenueUSD,
			BookingsCount: item.Count,
		})
	}

	return &domain.StatsResponse{
		Period:    period,
		Summary:   summary,
		Breakdown: breakdown,
	}, nil
}

// GetAllPaidBookings lee directamente de MongoDB para garantizar que los datos
// reflejen siempre el estado actual de cada reserva, sin importar ediciones posteriores.
func (r *statsRepository) GetAllPaidBookings(ctx context.Context) ([]PaymentRecord, error) {
	opts := options.Find().SetSort(bson.D{{Key: "paid_at", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{"status": "pagado"}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type mongoBooking struct {
		ID        int64 `bson:"id"`
		ApartmentID int64 `bson:"apartment_id"`
		GuestInfo struct {
			FirstName string `bson:"first_name"`
			LastName  string `bson:"last_name"`
			DNI       string `bson:"dni"`
			Email     string `bson:"email"`
			Phone     string `bson:"phone"`
		} `bson:"user_info"`
		CheckIn          time.Time  `bson:"check_in"`
		CheckOut         time.Time  `bson:"check_out"`
		TotalPrice       float64    `bson:"total_price"`
		USDAmount        *float64   `bson:"usd_amount"`
		ExchangeRateUsed *float64   `bson:"exchange_rate_used"`
		PaymentMethod    string     `bson:"payment_method"`
		PaidAt           *time.Time `bson:"paid_at"`
	}

	var raw []mongoBooking
	if err := cursor.All(ctx, &raw); err != nil {
		return nil, err
	}

	records := make([]PaymentRecord, 0, len(raw))
	for _, b := range raw {
		nights := int(b.CheckOut.Sub(b.CheckIn).Hours() / 24)
		if nights < 1 {
			nights = 1
		}
		paidAt := time.Time{}
		if b.PaidAt != nil {
			paidAt = *b.PaidAt
		}
		usdAmount := 0.0
		if b.USDAmount != nil {
			usdAmount = *b.USDAmount
		}
		exchangeRate := 0.0
		if b.ExchangeRateUsed != nil {
			exchangeRate = *b.ExchangeRateUsed
		}
		records = append(records, PaymentRecord{
			ID:             b.ID,
			BookingID:      b.ID,
			ApartmentID:    b.ApartmentID,
			GuestFirstName: b.GuestInfo.FirstName,
			GuestLastName:  b.GuestInfo.LastName,
			GuestDNI:       b.GuestInfo.DNI,
			GuestEmail:     b.GuestInfo.Email,
			GuestPhone:     b.GuestInfo.Phone,
			CheckIn:        b.CheckIn.UTC().Format("2006-01-02"),
			CheckOut:       b.CheckOut.UTC().Format("2006-01-02"),
			Nights:         nights,
			AmountARS:      b.TotalPrice,
			AmountUSD:      usdAmount,
			ExchangeRateID: 0,
			ExchangeRate:   exchangeRate,
			PaymentMethod:  b.PaymentMethod,
			PaidAt:         paidAt,
		})
	}
	return records, nil
}
