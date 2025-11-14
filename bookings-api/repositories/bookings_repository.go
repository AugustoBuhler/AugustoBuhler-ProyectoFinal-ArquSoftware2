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
	Delete(ctx context.Context, id int64) error
	CheckAvailability(ctx context.Context, apartmentID int64, checkIn, checkOut time.Time, excludeBookingID *int64) (bool, error)
	GetNextID(ctx context.Context) (int64, error)
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
		"status":       bson.M{"$ne": "cancelled"}, // Excluir reservas canceladas
		"check_in":     bson.M{"$lt": checkOut},    // existing.check_in < requested.check_out
		"check_out":    bson.M{"$gt": checkIn},     // existing.check_out > requested.check_in
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

