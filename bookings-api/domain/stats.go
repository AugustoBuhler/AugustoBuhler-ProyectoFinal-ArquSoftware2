package domain

type StatsSummary struct {
	TotalRevenueARS   float64 `json:"total_revenue_ars"`
	TotalRevenueUSD   float64 `json:"total_revenue_usd"`
	TotalPaidBookings int64   `json:"total_paid_bookings"`
	AvgBookingARS     float64 `json:"avg_booking_ars"`
	AvgBookingUSD     float64 `json:"avg_booking_usd"`
}

type StatsBreakdownItem struct {
	Label         string  `json:"label"`
	RevenueARS    float64 `json:"revenue_ars"`
	RevenueUSD    float64 `json:"revenue_usd"`
	BookingsCount int64   `json:"bookings_count"`
}

type StatsResponse struct {
	Period     string               `json:"period"`
	DollarRate float64              `json:"dollar_rate"`
	Summary    StatsSummary         `json:"summary"`
	Breakdown  []StatsBreakdownItem `json:"breakdown"`
}
