package repositories

import (
	"context"
	"errors"
	"time"

	"bookings-api/domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type BookingRepository interface {
	Create(ctx context.Context, booking *domain.Booking) error
	GetByID(ctx context.Context, id int64) (*domain.Booking, error)
	GetByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error)
	GetAll(ctx context.Context, filters map[string]interface{}, skip, limit int64) ([]*domain.Booking, error)
	Count(ctx context.Context, filters map[string]interface{}) (int64, error)
	Update(ctx context.Context, id int64, booking *domain.Booking) error
	UpdateStatus(ctx context.Context, id int64, status string) error
	Delete(ctx context.Context, id int64) error
	CheckAvailability(ctx context.Context, apartmentID int64, checkIn, checkOut time.Time, excludeBookingID *int64) (bool, error)
	GetNextID(ctx context.Context) (int64, error)
	GetExpiredPaidBookings(ctx context.Context) ([]*domain.Booking, error)
	MarkAsPaid(ctx context.Context, id int64, usdAmount float64, exchangeRate float64, paidAt time.Time) error
	FindByDNIAndEmail(ctx context.Context, dni, email string) ([]*domain.Booking, error)
	GetBookedApartmentIDs(ctx context.Context, ids []int64, checkIn, checkOut time.Time) (map[int64]bool, error)
	SaveMPPreferenceID(ctx context.Context, id int64, preferenceID string) error
	MarkDepositPaid(ctx context.Context, id int64, paymentID string) error
	CancelExpiredPendingBookings(ctx context.Context, maxAge time.Duration) (int, error)
	CancelWithReason(ctx context.Context, id int64, reason string) error
}

type bookingRepository struct {
	collection *mongo.Collection
}

func NewBookingRepository(collection *mongo.Collection) BookingRepository {
	return &bookingRepository{collection: collection}
}

func (r *bookingRepository) GetNextID(ctx context.Context) (int64, error) {
	opts := options.Find().SetSort(bson.D{{Key: "id", Value: -1}}).SetLimit(1)
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return 1, nil
	}
	defer cursor.Close(ctx)

	if cursor.Next(ctx) {
		var booking domain.Booking
		if err := cursor.Decode(&booking); err != nil {
			return 1, nil
		}
		return booking.ID + 1, nil
	}
	return 1, nil
}

func (r *bookingRepository) Create(ctx context.Context, booking *domain.Booking) error {
	nextID, err := r.GetNextID(ctx)
	if err != nil {
		return err
	}
	booking.ID = nextID
	booking.CreatedAt = time.Now()
	booking.UpdatedAt = time.Now()

	_, err = r.collection.InsertOne(ctx, booking)
	return err
}

func (r *bookingRepository) GetByID(ctx context.Context, id int64) (*domain.Booking, error) {
	var booking domain.Booking
	err := r.collection.FindOne(ctx, bson.M{"id": id}).Decode(&booking)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("booking not found")
		}
		return nil, err
	}
	// Asegurar que las fechas estén en UTC al leerlas de MongoDB
	// CRÍTICO: MongoDB almacena fechas en UTC, pero cuando Go las lee, puede interpretarlas
	// en la zona horaria local. Usamos .UTC() para convertir a UTC y luego extraemos
	// los componentes de fecha directamente de UTC usando los métodos UTC del time.Time
	if !booking.CheckIn.IsZero() {
		utcTime := booking.CheckIn.UTC()
		year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
		booking.CheckIn = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	}
	if !booking.CheckOut.IsZero() {
		utcTime := booking.CheckOut.UTC()
		year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
		booking.CheckOut = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	}
	return &booking, nil
}

func (r *bookingRepository) GetByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error) {
	filter := bson.M{"user_id": userID}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var bookings []*domain.Booking
	if err = cursor.All(ctx, &bookings); err != nil {
		return nil, err
	}
	// Asegurar que todas las fechas estén en UTC al leerlas de MongoDB
	// CRÍTICO: Extraer componentes de fecha directamente de UTC
	for i := range bookings {
		if !bookings[i].CheckIn.IsZero() {
			utcTime := bookings[i].CheckIn.UTC()
			year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
			bookings[i].CheckIn = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
		}
		if !bookings[i].CheckOut.IsZero() {
			utcTime := bookings[i].CheckOut.UTC()
			year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
			bookings[i].CheckOut = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
		}
	}
	return bookings, nil
}

func (r *bookingRepository) GetAll(ctx context.Context, filters map[string]interface{}, skip, limit int64) ([]*domain.Booking, error) {
	filter := bson.M{}
	
	// Aplicar filtros opcionales
	if apartmentID, ok := filters["apartment_id"]; ok {
		filter["apartment_id"] = apartmentID
	}
	if status, ok := filters["status"]; ok {
		filter["status"] = status
	}
	if userID, ok := filters["user_id"]; ok {
		filter["user_id"] = userID
	}
	// Nota: Si user_id no está en filtros, retorna TODAS las reservas (públicas y con user_id)

	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.D{{Key: "id", Value: -1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var bookings []*domain.Booking
	if err = cursor.All(ctx, &bookings); err != nil {
		return nil, err
	}
	// Asegurar que todas las fechas estén en UTC al leerlas de MongoDB
	// CRÍTICO: Extraer componentes de fecha directamente de UTC
	for i := range bookings {
		if !bookings[i].CheckIn.IsZero() {
			utcTime := bookings[i].CheckIn.UTC()
			year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
			bookings[i].CheckIn = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
		}
		if !bookings[i].CheckOut.IsZero() {
			utcTime := bookings[i].CheckOut.UTC()
			year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
			bookings[i].CheckOut = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
		}
	}
	return bookings, nil
}

func (r *bookingRepository) Count(ctx context.Context, filters map[string]interface{}) (int64, error) {
	filter := bson.M{}
	
	// Aplicar filtros opcionales
	if apartmentID, ok := filters["apartment_id"]; ok {
		filter["apartment_id"] = apartmentID
	}
	if status, ok := filters["status"]; ok {
		filter["status"] = status
	}
	if userID, ok := filters["user_id"]; ok {
		filter["user_id"] = userID
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	return count, err
}

func (r *bookingRepository) Update(ctx context.Context, id int64, booking *domain.Booking) error {
	booking.UpdatedAt = time.Now()
	update := bson.M{"$set": booking}

	result, err := r.collection.UpdateOne(ctx, bson.M{"id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("booking not found")
	}
	return nil
}

func (r *bookingRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return errors.New("booking not found")
	}
	return nil
}

// CheckAvailability verifica si un apartamento está disponible para un rango de fechas
func (r *bookingRepository) CheckAvailability(ctx context.Context, apartmentID int64, checkIn, checkOut time.Time, excludeBookingID *int64) (bool, error) {
	// Buscar reservas que se solapen con el rango solicitado
	// Un solapamiento ocurre cuando:
	// - existing.check_in < requested.check_out AND existing.check_out > requested.check_in
	// En MongoDB, múltiples condiciones en el mismo nivel se evalúan con AND implícito
	filter := bson.M{
		"apartment_id": apartmentID,
		// "pendiente_pago" bloquea fechas temporalmente (hold de 30 min) para evitar doble reserva
		"status": bson.M{"$nin": []string{"cancelled", "cancelada", "concluida", "finalizada"}},
		"check_in":     bson.M{"$lt": checkOut},                            // existing.check_in < requested.check_out
		"check_out":    bson.M{"$gt": checkIn},                             // existing.check_out > requested.check_in
	}

	// Excluir la reserva actual si se está actualizando
	if excludeBookingID != nil {
		filter["id"] = bson.M{"$ne": *excludeBookingID}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}

	// Si count == 0, el apartamento está disponible
	return count == 0, nil
}

// UpdateStatus actualiza solo el estado de una reserva
func (r *bookingRepository) UpdateStatus(ctx context.Context, id int64, status string) error {
	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}

	result, err := r.collection.UpdateOne(ctx, bson.M{"id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("booking not found")
	}
	return nil
}

// MarkAsPaid actualiza el estado a "pagado" y almacena el monto en USD y el tipo de cambio usado
func (r *bookingRepository) MarkAsPaid(ctx context.Context, id int64, usdAmount float64, exchangeRate float64, paidAt time.Time) error {
	update := bson.M{
		"$set": bson.M{
			"status":             "pagado",
			"usd_amount":         usdAmount,
			"exchange_rate_used": exchangeRate,
			"paid_at":            paidAt,
			"updated_at":         time.Now(),
		},
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("booking not found")
	}
	return nil
}

// SaveMPPreferenceID guarda el preference_id de Mercado Pago en la reserva
func (r *bookingRepository) SaveMPPreferenceID(ctx context.Context, id int64, preferenceID string) error {
	update := bson.M{
		"$set": bson.M{
			"mp_preference_id": preferenceID,
			"updated_at":       time.Now(),
		},
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("booking not found")
	}
	return nil
}

// MarkDepositPaid registra el pago de la seña vía Mercado Pago
func (r *bookingRepository) MarkDepositPaid(ctx context.Context, id int64, paymentID string) error {
	update := bson.M{
		"$set": bson.M{
			"deposit_paid":  true,
			"mp_payment_id": paymentID,
			"updated_at":    time.Now(),
		},
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("booking not found")
	}
	return nil
}

// GetExpiredPaidBookings obtiene todas las reservas pagadas cuyo check_out ya pasó
func (r *bookingRepository) GetExpiredPaidBookings(ctx context.Context) ([]*domain.Booking, error) {
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	filter := bson.M{
		"status":    "pagado",
		"check_out": bson.M{"$lt": today},
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var bookings []*domain.Booking
	if err = cursor.All(ctx, &bookings); err != nil {
		return nil, err
	}

	// Asegurar que todas las fechas estén en UTC
	for i := range bookings {
		if !bookings[i].CheckIn.IsZero() {
			utcTime := bookings[i].CheckIn.UTC()
			year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
			bookings[i].CheckIn = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
		}
		if !bookings[i].CheckOut.IsZero() {
			utcTime := bookings[i].CheckOut.UTC()
			year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
			bookings[i].CheckOut = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
		}
	}

	return bookings, nil
}

// GetBookedApartmentIDs devuelve el conjunto de IDs que tienen reservas activas en el rango dado.
// Una sola query MongoDB en lugar de N queries individuales.
func (r *bookingRepository) GetBookedApartmentIDs(ctx context.Context, ids []int64, checkIn, checkOut time.Time) (map[int64]bool, error) {
	filter := bson.M{
		"apartment_id": bson.M{"$in": ids},
		"status":       bson.M{"$nin": []string{"cancelled", "cancelada", "concluida", "finalizada"}},
		"check_in":     bson.M{"$lt": checkOut},
		"check_out":    bson.M{"$gt": checkIn},
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	booked := make(map[int64]bool)
	for cursor.Next(ctx) {
		var b struct {
			ApartmentID int64 `bson:"apartment_id"`
		}
		if err := cursor.Decode(&b); err == nil {
			booked[b.ApartmentID] = true
		}
	}
	return booked, nil
}

// FindByDNIAndEmail busca reservas confirmadas de un huésped por DNI y email
func (r *bookingRepository) FindByDNIAndEmail(ctx context.Context, dni, email string) ([]*domain.Booking, error) {
	filter := bson.M{
		"user_info.dni":   dni,
		"user_info.email": email,
		"status":          bson.M{"$nin": []string{"pendiente_pago"}},
	}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var bookings []*domain.Booking
	if err := cursor.All(ctx, &bookings); err != nil {
		return nil, err
	}
	return bookings, nil
}

// CancelWithReason cancela una reserva por parte del huésped guardando el motivo de cancelación
func (r *bookingRepository) CancelWithReason(ctx context.Context, id int64, reason string) error {
	update := bson.M{
		"$set": bson.M{
			"status":        "cancelada",
			"cancel_reason": reason,
			"updated_at":    time.Now().UTC(),
		},
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("booking not found")
	}
	return nil
}

// CancelExpiredPendingBookings cancela reservas públicas en "pendiente_pago" que superaron maxAge sin pagar
func (r *bookingRepository) CancelExpiredPendingBookings(ctx context.Context, maxAge time.Duration) (int, error) {
	cutoff := time.Now().UTC().Add(-maxAge)
	filter := bson.M{
		"status":     "pendiente_pago",
		"created_at": bson.M{"$lt": cutoff},
	}
	update := bson.M{
		"$set": bson.M{
			"status":     "cancelada",
			"updated_at": time.Now().UTC(),
		},
	}
	result, err := r.collection.UpdateMany(ctx, filter, update)
	if err != nil {
		return 0, err
	}
	return int(result.ModifiedCount), nil
}

