package services_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"bookings-api/domain"
	"bookings-api/repositories"
	"bookings-api/services"
)

// --- Mocks ---

type mockBookingRepo struct {
	bookings       map[int64]*domain.Booking
	availableMap   map[int64]bool
	nextID         int64
	expiredResults []*domain.Booking
}

func newMockRepo() *mockBookingRepo {
	return &mockBookingRepo{
		bookings:     make(map[int64]*domain.Booking),
		availableMap: make(map[int64]bool),
		nextID:       1,
	}
}

func (m *mockBookingRepo) Create(ctx context.Context, b *domain.Booking) error {
	b.ID = m.nextID
	m.nextID++
	b.CreatedAt = time.Now()
	b.UpdatedAt = time.Now()
	m.bookings[b.ID] = b
	return nil
}
func (m *mockBookingRepo) GetByID(ctx context.Context, id int64) (*domain.Booking, error) {
	b, ok := m.bookings[id]
	if !ok {
		return nil, errors.New("booking not found")
	}
	return b, nil
}
func (m *mockBookingRepo) GetByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error) {
	return nil, nil
}
func (m *mockBookingRepo) GetAll(ctx context.Context, filters map[string]interface{}, skip, limit int64) ([]*domain.Booking, error) {
	return nil, nil
}
func (m *mockBookingRepo) Count(ctx context.Context, filters map[string]interface{}) (int64, error) {
	return 0, nil
}
func (m *mockBookingRepo) Update(ctx context.Context, id int64, b *domain.Booking) error {
	m.bookings[id] = b
	return nil
}
func (m *mockBookingRepo) UpdateStatus(ctx context.Context, id int64, status string) error {
	b, ok := m.bookings[id]
	if !ok {
		return errors.New("booking not found")
	}
	b.Status = status
	return nil
}
func (m *mockBookingRepo) Delete(ctx context.Context, id int64) error {
	delete(m.bookings, id)
	return nil
}
func (m *mockBookingRepo) CheckAvailability(ctx context.Context, apartmentID int64, checkIn, checkOut time.Time, excludeID *int64) (bool, error) {
	available, ok := m.availableMap[apartmentID]
	if !ok {
		return true, nil
	}
	return available, nil
}
func (m *mockBookingRepo) GetNextID(ctx context.Context) (int64, error) { return m.nextID, nil }
func (m *mockBookingRepo) GetExpiredPaidBookings(ctx context.Context) ([]*domain.Booking, error) {
	return m.expiredResults, nil
}
func (m *mockBookingRepo) MarkAsPaid(ctx context.Context, id int64, usdAmount float64, exchangeRate float64, paidAt time.Time) error {
	b, ok := m.bookings[id]
	if !ok {
		return errors.New("booking not found")
	}
	b.Status = "pagado"
	return nil
}

type mockUsersClient struct{ exists bool }

func (m *mockUsersClient) GetUserByID(userID int64) (bool, error) { return m.exists, nil }

// mockApartmentsClient devuelve directamente los apartamentos configurados para cada llamada.
type mockApartmentsClient struct {
	byType []*repositories.ApartmentInfo // devueltos por GetAllApartmentsByType
	byID   map[int64]*repositories.ApartmentInfo
}

func (m *mockApartmentsClient) GetApartmentByID(id int64) (*repositories.ApartmentInfo, error) {
	if a, ok := m.byID[id]; ok {
		return a, nil
	}
	return nil, errors.New("apartment not found")
}
func (m *mockApartmentsClient) GetAvailableApartmentByType(t, ci, co string) (*repositories.ApartmentInfo, error) {
	if len(m.byType) > 0 {
		return m.byType[0], nil
	}
	return nil, errors.New("no apartment available")
}
func (m *mockApartmentsClient) GetAllApartmentsByType(t string) ([]*repositories.ApartmentInfo, error) {
	return m.byType, nil
}

type mockRMQ struct{}

func (m *mockRMQ) PublishBookingEvent(action string, bookingID int64) error { return nil }

type mockFinanceRepo struct{}

func (m *mockFinanceRepo) AddDollarRate(ctx context.Context, rate float64) (int64, error) {
	return 0, nil
}
func (m *mockFinanceRepo) GetCurrentDollarRate(ctx context.Context) (*repositories.DollarRateRecord, error) {
	return nil, nil
}
func (m *mockFinanceRepo) GetDollarRateHistory(ctx context.Context) ([]repositories.DollarRateRecord, error) {
	return nil, nil
}
func (m *mockFinanceRepo) CreatePayment(ctx context.Context, input repositories.CreatePaymentInput) error {
	return nil
}
func (m *mockFinanceRepo) GetAllPayments(ctx context.Context) ([]repositories.PaymentRecord, error) {
	return nil, nil
}
func (m *mockFinanceRepo) GetFinanceStats(ctx context.Context, period string) (*domain.StatsResponse, error) {
	return nil, nil
}

// --- Helpers ---

func tomorrow() string {
	return time.Now().UTC().AddDate(0, 0, 1).Format("2006-01-02")
}
func dayAfterTomorrow() string {
	return time.Now().UTC().AddDate(0, 0, 2).Format("2006-01-02")
}
func yesterday() string {
	return time.Now().UTC().AddDate(0, 0, -1).Format("2006-01-02")
}

func baseRequest(aptType string) domain.CreateBookingRequest {
	return domain.CreateBookingRequest{
		ApartmentType: aptType,
		CheckIn:       tomorrow(),
		CheckOut:      dayAfterTomorrow(),
		Guests:        2,
		PaymentMethod: "efectivo",
		GuestInfo: domain.GuestInfo{
			FirstName: "Juan",
			LastName:  "Perez",
			DNI:       "12345678",
			Phone:     "+5491123456789",
			Email:     "juan@example.com",
		},
	}
}

func apartment(id int64, maxGuests int, price float64) *repositories.ApartmentInfo {
	return &repositories.ApartmentInfo{ID: id, MaxGuests: maxGuests, PricePerNight: price, Available: true}
}

func newService(repo *mockBookingRepo, apts []*repositories.ApartmentInfo) services.BookingService {
	byID := make(map[int64]*repositories.ApartmentInfo)
	for _, a := range apts {
		byID[a.ID] = a
	}
	return services.NewBookingService(
		repo,
		&mockUsersClient{exists: true},
		&mockApartmentsClient{byType: apts, byID: byID},
		&mockRMQ{},
		&mockFinanceRepo{},
	)
}

// --- Tests ---

func TestCreateBooking_CheckInInPast_Fails(t *testing.T) {
	repo := newMockRepo()
	svc := newService(repo, []*repositories.ApartmentInfo{apartment(1, 4, 100)})

	req := baseRequest("quadruple")
	req.CheckIn = yesterday()
	req.CheckOut = tomorrow()

	_, err := svc.CreateBooking(context.Background(), req, false, nil)
	if err == nil {
		t.Fatal("expected error for past check_in, got nil")
	}
	if err.Error() != "check_in cannot be in the past" {
		t.Fatalf("unexpected error message: %q", err.Error())
	}
}

func TestCreateBooking_CheckOutBeforeCheckIn_Fails(t *testing.T) {
	repo := newMockRepo()
	svc := newService(repo, []*repositories.ApartmentInfo{apartment(1, 4, 100)})

	req := baseRequest("quadruple")
	req.CheckIn = dayAfterTomorrow()
	req.CheckOut = tomorrow()

	_, err := svc.CreateBooking(context.Background(), req, false, nil)
	if err == nil {
		t.Fatal("expected error when check_out <= check_in, got nil")
	}
}

func TestCreateBooking_NoApartmentTypeOrID_Fails(t *testing.T) {
	repo := newMockRepo()
	svc := newService(repo, nil)

	req := baseRequest("")
	req.ApartmentType = ""
	req.ApartmentID = nil

	_, err := svc.CreateBooking(context.Background(), req, false, nil)
	if err == nil {
		t.Fatal("expected error when neither apartment_id nor apartment_type provided, got nil")
	}
}

func TestCreateBooking_ByType_Success(t *testing.T) {
	repo := newMockRepo()
	repo.availableMap[1] = true
	svc := newService(repo, []*repositories.ApartmentInfo{apartment(1, 4, 150)})

	req := baseRequest("quadruple")
	booking, err := svc.CreateBooking(context.Background(), req, false, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if booking.ApartmentID != 1 {
		t.Errorf("expected apartment_id 1, got %d", booking.ApartmentID)
	}
	if booking.Status != "reservada" {
		t.Errorf("expected status 'reservada', got %q", booking.Status)
	}
	// 1 noche * 150
	if booking.TotalPrice != 150 {
		t.Errorf("expected total_price 150, got %f", booking.TotalPrice)
	}
}

func TestCreateBooking_NoApartmentsOfType_Fails(t *testing.T) {
	repo := newMockRepo()
	svc := newService(repo, []*repositories.ApartmentInfo{})

	_, err := svc.CreateBooking(context.Background(), baseRequest("quadruple"), false, nil)
	if err == nil {
		t.Fatal("expected error when type has no apartments, got nil")
	}
}

func TestCreateBooking_AllApartmentsUnavailable_Fails(t *testing.T) {
	repo := newMockRepo()
	repo.availableMap[1] = false
	repo.availableMap[2] = false
	apts := []*repositories.ApartmentInfo{apartment(1, 3, 120), apartment(2, 3, 120)}
	svc := newService(repo, apts)

	_, err := svc.CreateBooking(context.Background(), baseRequest("triple"), false, nil)
	if err == nil {
		t.Fatal("expected error when all apartments of type are unavailable, got nil")
	}
}

func TestCreateBooking_GuestsExceedCapacity_Fails(t *testing.T) {
	repo := newMockRepo()
	repo.availableMap[1] = true
	svc := newService(repo, []*repositories.ApartmentInfo{apartment(1, 2, 100)})

	req := baseRequest("double_twin")
	req.Guests = 5

	_, err := svc.CreateBooking(context.Background(), req, false, nil)
	if err == nil {
		t.Fatal("expected capacity error, got nil")
	}
}

func TestCancelBooking_AlreadyCancelled_Fails(t *testing.T) {
	repo := newMockRepo()
	repo.bookings[1] = &domain.Booking{ID: 1, Status: "cancelada"}
	svc := newService(repo, nil)

	_, err := svc.CancelBooking(context.Background(), 1)
	if err == nil {
		t.Fatal("expected error cancelling already cancelled booking, got nil")
	}
}

func TestCancelBooking_Completed_Fails(t *testing.T) {
	repo := newMockRepo()
	repo.bookings[1] = &domain.Booking{ID: 1, Status: "finalizada"}
	svc := newService(repo, nil)

	_, err := svc.CancelBooking(context.Background(), 1)
	if err == nil {
		t.Fatal("expected error cancelling a completed booking, got nil")
	}
}

func TestCancelBooking_Reservada_Success(t *testing.T) {
	repo := newMockRepo()
	repo.bookings[1] = &domain.Booking{ID: 1, Status: "reservada"}
	svc := newService(repo, nil)

	b, err := svc.CancelBooking(context.Background(), 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if b.Status != "cancelada" {
		t.Errorf("expected status 'cancelada', got %q", b.Status)
	}
}

func TestMarkExpiredBookingsAsCompleted(t *testing.T) {
	repo := newMockRepo()
	past := time.Now().UTC().AddDate(0, 0, -3)
	repo.bookings[1] = &domain.Booking{ID: 1, Status: "pagado", CheckOut: past}
	repo.bookings[2] = &domain.Booking{ID: 2, Status: "pagado", CheckOut: past}
	repo.expiredResults = []*domain.Booking{repo.bookings[1], repo.bookings[2]}
	svc := newService(repo, nil)

	count, err := svc.MarkExpiredBookingsAsCompleted(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2 completed, got %d", count)
	}
}

func TestCompleteBooking_FutureCheckOut_Fails(t *testing.T) {
	repo := newMockRepo()
	future := time.Now().UTC().AddDate(0, 0, 5)
	repo.bookings[1] = &domain.Booking{ID: 1, Status: "pagado", CheckOut: future}
	svc := newService(repo, nil)

	_, err := svc.CompleteBooking(context.Background(), 1)
	if err == nil {
		t.Fatal("expected error completing booking with future checkout, got nil")
	}
}

func TestCompleteBooking_PastCheckOut_Success(t *testing.T) {
	repo := newMockRepo()
	past := time.Now().UTC().AddDate(0, 0, -2)
	repo.bookings[1] = &domain.Booking{ID: 1, Status: "pagado", CheckOut: past}
	svc := newService(repo, nil)

	b, err := svc.CompleteBooking(context.Background(), 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if b.Status != "finalizada" {
		t.Errorf("expected status 'finalizada', got %q", b.Status)
	}
}
