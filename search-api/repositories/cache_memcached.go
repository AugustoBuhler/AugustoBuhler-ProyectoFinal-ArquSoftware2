package repositories

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/bradfitz/gomemcache/memcache"
)

type MemcachedCache interface {
	Get(key string) (interface{}, bool)
	Set(key string, value interface{}, ttl time.Duration) error
}

type memcachedCache struct {
	client *memcache.Client
}

func NewMemcachedCache() MemcachedCache {
	url := os.Getenv("MEMCACHED_URL")
	if url == "" {
		url = "memcached:11211"
	}
	return &memcachedCache{
		client: memcache.New(url),
	}
}

func (c *memcachedCache) Get(key string) (interface{}, bool) {
	item, err := c.client.Get(key)
	if err != nil {
		return nil, false
	}

	var result interface{}
	if err := json.Unmarshal(item.Value, &result); err != nil {
		return nil, false
	}

	return result, true
}

func (c *memcachedCache) Set(key string, value interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	item := &memcache.Item{
		Key:        key,
		Value:      jsonData,
		Expiration: int32(ttl.Seconds()),
	}

	return c.client.Set(item)
}

