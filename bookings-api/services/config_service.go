package services

import (
	"context"
	"time"

	"bookings-api/repositories"
)

type ConfigService interface {
	GetDollarRate(ctx context.Context) (float64, time.Time, error)
	SetDollarRate(ctx context.Context, rate float64) error
	GetDollarRateHistory(ctx context.Context) ([]repositories.DollarRateRecord, error)
}

type configService struct {
	financeRepo repositories.FinanceRepository
}

func NewConfigService(financeRepo repositories.FinanceRepository) ConfigService {
	return &configService{financeRepo: financeRepo}
}

func (s *configService) GetDollarRate(ctx context.Context) (float64, time.Time, error) {
	rec, err := s.financeRepo.GetCurrentDollarRate(ctx)
	if err != nil {
		return 0, time.Time{}, err
	}
	if rec == nil {
		return 0, time.Time{}, nil
	}
	return rec.Rate, rec.CreatedAt, nil
}

func (s *configService) SetDollarRate(ctx context.Context, rate float64) error {
	_, err := s.financeRepo.AddDollarRate(ctx, rate)
	return err
}

func (s *configService) GetDollarRateHistory(ctx context.Context) ([]repositories.DollarRateRecord, error) {
	return s.financeRepo.GetDollarRateHistory(ctx)
}
