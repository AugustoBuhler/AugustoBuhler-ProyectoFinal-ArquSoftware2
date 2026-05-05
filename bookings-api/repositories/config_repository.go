package repositories

import (
	"context"
	"time"

	"bookings-api/domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ConfigRepository interface {
	GetDollarRate(ctx context.Context) (float64, time.Time, error)
	SetDollarRate(ctx context.Context, rate float64) error
}

type configRepository struct {
	collection *mongo.Collection
}

func NewConfigRepository(collection *mongo.Collection) ConfigRepository {
	return &configRepository{collection: collection}
}

func (r *configRepository) GetDollarRate(ctx context.Context) (float64, time.Time, error) {
	var cfg domain.DollarRateConfig
	err := r.collection.FindOne(ctx, bson.M{"key": "dollar_rate"}).Decode(&cfg)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 0, time.Time{}, nil
		}
		return 0, time.Time{}, err
	}
	return cfg.Rate, cfg.UpdatedAt, nil
}

func (r *configRepository) SetDollarRate(ctx context.Context, rate float64) error {
	update := bson.M{
		"$set": bson.M{
			"key":        "dollar_rate",
			"rate":       rate,
			"updated_at": time.Now(),
		},
	}
	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, bson.M{"key": "dollar_rate"}, update, opts)
	return err
}
