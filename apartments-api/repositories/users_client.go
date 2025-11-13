package repositories

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type UsersClient interface {
	GetUserByID(userID int64) (bool, error)
}

type usersHTTPClient struct {
	baseURL string
}

func NewUsersClient() UsersClient {
	baseURL := os.Getenv("USERS_API_URL")
	if baseURL == "" {
		baseURL = "http://users-api:8080"
	}
	return &usersHTTPClient{baseURL: baseURL}
}

func (c *usersHTTPClient) GetUserByID(userID int64) (bool, error) {
	url := fmt.Sprintf("%s/api/v1/internal/users/%d", c.baseURL, userID)
	
	resp, err := http.Get(url)
	if err != nil {
		return false, fmt.Errorf("failed to connect to users-api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("users-api returned status %d: %s", resp.StatusCode, string(body))
	}

	var user map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return false, fmt.Errorf("failed to decode user response: %w", err)
	}

	return true, nil
}

