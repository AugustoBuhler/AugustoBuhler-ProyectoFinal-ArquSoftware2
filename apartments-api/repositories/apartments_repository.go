package repositories

import (
	"context"
	"errors"
	"time"

	"apartments-api/domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ApartmentRepository interface {
	Create(ctx context.Context, apartment *domain.Apartment) error
	GetByID(ctx context.Context, id int64) (*domain.Apartment, error)
	GetAll(ctx context.Context, filters map[string]interface{}, skip, limit int64) ([]*domain.Apartment, error)
	Update(ctx context.Context, id int64, apartment *domain.Apartment) error
	Delete(ctx context.Context, id int64) error
	GetNextID(ctx context.Context) (int64, error)
	Count(ctx context.Context, filters map[string]interface{}) (int64, error)
}

type apartmentRepository struct {
	collection *mongo.Collection
}

func NewApartmentRepository(collection *mongo.Collection) ApartmentRepository {
	return &apartmentRepository{collection: collection}
}

func (r *apartmentRepository) GetNextID(ctx context.Context) (int64, error) {
	// Buscar el máximo ID actual y retornar el siguiente
	opts := options.Find().SetSort(bson.D{{Key: "id", Value: -1}}).SetLimit(1)
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return 1, nil // Si no hay documentos, empezar con 1
	}
	defer cursor.Close(ctx)

	if cursor.Next(ctx) {
		var apt domain.Apartment
		if err := cursor.Decode(&apt); err != nil {
			return 1, nil
		}
		return apt.ID + 1, nil
	}
	return 1, nil
}

func (r *apartmentRepository) Create(ctx context.Context, apartment *domain.Apartment) error {
	// Obtener próximo ID
	nextID, err := r.GetNextID(ctx)
	if err != nil {
		return err
	}
	apartment.ID = nextID
	apartment.CreatedAt = time.Now()
	apartment.UpdatedAt = time.Now()

	_, err = r.collection.InsertOne(ctx, apartment)
	return err
}

func (r *apartmentRepository) GetByID(ctx context.Context, id int64) (*domain.Apartment, error) {
	var apartment domain.Apartment
	err := r.collection.FindOne(ctx, bson.M{"id": id}).Decode(&apartment)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("apartment not found")
		}
		return nil, err
	}
	return &apartment, nil
}

func (r *apartmentRepository) GetAll(ctx context.Context, filters map[string]interface{}, skip, limit int64) ([]*domain.Apartment, error) {
	filter := bson.M{}
	
	// Aplicar filtros
	if city, ok := filters["city"]; ok {
		filter["city"] = city
	}
	if available, ok := filters["available"]; ok {
		filter["available"] = available
	}
	if maxGuests, ok := filters["max_guests"]; ok {
		filter["max_guests"] = bson.M{"$gte": maxGuests}
	}

	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.D{{Key: "id", Value: 1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var apartments []*domain.Apartment
	if err = cursor.All(ctx, &apartments); err != nil {
		return nil, err
	}
	return apartments, nil
}

func (r *apartmentRepository) Update(ctx context.Context, id int64, apartment *domain.Apartment) error {
	apartment.UpdatedAt = time.Now()
	update := bson.M{
		"$set": apartment,
	}
	
	result, err := r.collection.UpdateOne(ctx, bson.M{"id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("apartment not found")
	}
	return nil
}

func (r *apartmentRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return errors.New("apartment not found")
	}
	return nil
}

func (r *apartmentRepository) Count(ctx context.Context, filters map[string]interface{}) (int64, error) {
	filter := bson.M{}
	
	// Aplicar filtros
	if city, ok := filters["city"]; ok {
		filter["city"] = city
	}
	if available, ok := filters["available"]; ok {
		filter["available"] = available
	}
	if maxGuests, ok := filters["max_guests"]; ok {
		filter["max_guests"] = bson.M{"$gte": maxGuests}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	return count, err
}

