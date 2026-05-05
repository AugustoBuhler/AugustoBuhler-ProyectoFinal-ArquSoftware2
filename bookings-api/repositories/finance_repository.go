package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"bookings-api/domain"

	_ "github.com/go-sql-driver/mysql"
)

// ─── Domain types for MySQL finance data ──────────────────────────────────────

type DollarRateRecord struct {
	ID        int64     `json:"id"`
	Rate      float64   `json:"rate"`
	CreatedAt time.Time `json:"created_at"`
}

type PaymentRecord struct {
	ID              int64     `json:"id"`
	BookingID       int64     `json:"booking_id"`
	ApartmentID     int64     `json:"apartment_id"`
	GuestFirstName  string    `json:"guest_first_name"`
	GuestLastName   string    `json:"guest_last_name"`
	GuestDNI        string    `json:"guest_dni"`
	GuestEmail      string    `json:"guest_email"`
	GuestPhone      string    `json:"guest_phone"`
	CheckIn         string    `json:"check_in"`
	CheckOut        string    `json:"check_out"`
	Nights          int       `json:"nights"`
	AmountARS       float64   `json:"amount_ars"`
	AmountUSD       float64   `json:"amount_usd"`
	ExchangeRateID  int64     `json:"exchange_rate_id"`
	ExchangeRate    float64   `json:"exchange_rate"`
	PaymentMethod   string    `json:"payment_method"`
	PaidAt          time.Time `json:"paid_at"`
}

type CreatePaymentInput struct {
	BookingID      int64
	ApartmentID    int64
	GuestFirstName string
	GuestLastName  string
	GuestDNI       string
	GuestEmail     string
	GuestPhone     string
	CheckIn        time.Time
	CheckOut       time.Time
	AmountARS      float64
	AmountUSD      float64
	ExchangeRateID int64
	ExchangeRate   float64
	PaymentMethod  string
	PaidAt         time.Time
}

// ─── Interface ────────────────────────────────────────────────────────────────

type FinanceRepository interface {
	// Dollar rate history
	AddDollarRate(ctx context.Context, rate float64) (int64, error)
	GetCurrentDollarRate(ctx context.Context) (*DollarRateRecord, error)
	GetDollarRateHistory(ctx context.Context) ([]DollarRateRecord, error)

	// Payments
	CreatePayment(ctx context.Context, input CreatePaymentInput) error
	GetAllPayments(ctx context.Context) ([]PaymentRecord, error)
	GetFinanceStats(ctx context.Context, period string) (*domain.StatsResponse, error)
}

// ─── MySQL implementation ─────────────────────────────────────────────────────

type financeRepository struct {
	db *sql.DB
}

func NewFinanceRepository(db *sql.DB) FinanceRepository {
	return &financeRepository{db: db}
}

func (r *financeRepository) AddDollarRate(ctx context.Context, rate float64) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO dollar_rate_history (rate) VALUES (?)`, rate)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *financeRepository) GetCurrentDollarRate(ctx context.Context) (*DollarRateRecord, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, rate, created_at FROM dollar_rate_history ORDER BY id DESC LIMIT 1`)
	var rec DollarRateRecord
	if err := row.Scan(&rec.ID, &rec.Rate, &rec.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &rec, nil
}

func (r *financeRepository) GetDollarRateHistory(ctx context.Context) ([]DollarRateRecord, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, rate, created_at FROM dollar_rate_history ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []DollarRateRecord
	for rows.Next() {
		var rec DollarRateRecord
		if err := rows.Scan(&rec.ID, &rec.Rate, &rec.CreatedAt); err != nil {
			return nil, err
		}
		history = append(history, rec)
	}
	return history, nil
}

func (r *financeRepository) CreatePayment(ctx context.Context, input CreatePaymentInput) error {
	nights := int(input.CheckOut.Sub(input.CheckIn).Hours() / 24)
	if nights < 1 {
		nights = 1
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO payments
		  (booking_id, apartment_id, guest_first_name, guest_last_name, guest_dni,
		   guest_email, guest_phone, check_in, check_out, nights,
		   amount_ars, amount_usd, exchange_rate_id, exchange_rate, payment_method, paid_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
		ON DUPLICATE KEY UPDATE
		  amount_ars=VALUES(amount_ars), amount_usd=VALUES(amount_usd),
		  exchange_rate_id=VALUES(exchange_rate_id), exchange_rate=VALUES(exchange_rate),
		  paid_at=VALUES(paid_at)`,
		input.BookingID, input.ApartmentID,
		input.GuestFirstName, input.GuestLastName, input.GuestDNI,
		input.GuestEmail, input.GuestPhone,
		input.CheckIn.Format("2006-01-02"), input.CheckOut.Format("2006-01-02"), nights,
		input.AmountARS, input.AmountUSD,
		input.ExchangeRateID, input.ExchangeRate, input.PaymentMethod, input.PaidAt,
	)
	return err
}

func (r *financeRepository) GetAllPayments(ctx context.Context) ([]PaymentRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.booking_id, p.apartment_id,
		       p.guest_first_name, p.guest_last_name, p.guest_dni,
		       p.guest_email, p.guest_phone,
		       p.check_in, p.check_out, p.nights,
		       p.amount_ars, p.amount_usd,
		       p.exchange_rate_id, p.exchange_rate,
		       p.payment_method, p.paid_at
		FROM payments p
		ORDER BY p.paid_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []PaymentRecord
	for rows.Next() {
		var p PaymentRecord
		var checkIn, checkOut string
		if err := rows.Scan(
			&p.ID, &p.BookingID, &p.ApartmentID,
			&p.GuestFirstName, &p.GuestLastName, &p.GuestDNI,
			&p.GuestEmail, &p.GuestPhone,
			&checkIn, &checkOut, &p.Nights,
			&p.AmountARS, &p.AmountUSD,
			&p.ExchangeRateID, &p.ExchangeRate,
			&p.PaymentMethod, &p.PaidAt,
		); err != nil {
			return nil, err
		}
		p.CheckIn = checkIn
		p.CheckOut = checkOut
		payments = append(payments, p)
	}
	return payments, nil
}

func (r *financeRepository) GetFinanceStats(ctx context.Context, period string) (*domain.StatsResponse, error) {
	// ── Summary (all time) ──
	summaryRow := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount_ars),0), COALESCE(SUM(amount_usd),0), COUNT(*)
		 FROM payments`)
	var summary domain.StatsSummary
	if err := summaryRow.Scan(&summary.TotalRevenueARS, &summary.TotalRevenueUSD, &summary.TotalPaidBookings); err != nil {
		return nil, err
	}
	if summary.TotalPaidBookings > 0 {
		summary.AvgBookingARS = summary.TotalRevenueARS / float64(summary.TotalPaidBookings)
		summary.AvgBookingUSD = summary.TotalRevenueUSD / float64(summary.TotalPaidBookings)
	}

	// ── Breakdown by period ──
	var groupExpr, labelExpr, sinceClause string
	switch period {
	case "weekly":
		groupExpr = "YEAR(paid_at), WEEK(paid_at, 1)"
		labelExpr = "CONCAT('Semana ', WEEK(paid_at,1), '/', YEAR(paid_at))"
		sinceClause = "AND paid_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)"
	case "annual":
		groupExpr = "YEAR(paid_at)"
		labelExpr = "CAST(YEAR(paid_at) AS CHAR)"
		sinceClause = ""
	default: // monthly
		groupExpr = "YEAR(paid_at), MONTH(paid_at)"
		labelExpr = "CONCAT(MONTHNAME(paid_at), ' ', YEAR(paid_at))"
		sinceClause = "AND paid_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)"
	}

	query := fmt.Sprintf(`
		SELECT %s as label,
		       COALESCE(SUM(amount_ars),0) as revenue_ars,
		       COALESCE(SUM(amount_usd),0) as revenue_usd,
		       COUNT(*) as cnt
		FROM payments
		WHERE 1=1 %s
		GROUP BY %s
		ORDER BY %s`, labelExpr, sinceClause, groupExpr, groupExpr)

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var breakdown []domain.StatsBreakdownItem
	for rows.Next() {
		var item domain.StatsBreakdownItem
		if err := rows.Scan(&item.Label, &item.RevenueARS, &item.RevenueUSD, &item.BookingsCount); err != nil {
			return nil, err
		}
		breakdown = append(breakdown, item)
	}

	return &domain.StatsResponse{
		Period:    period,
		Summary:   summary,
		Breakdown: breakdown,
	}, nil
}
