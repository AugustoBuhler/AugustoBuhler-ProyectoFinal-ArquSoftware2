package repositories

import (
	"time"

	"github.com/patrickmn/go-cache"
)

type LocalCache interface {
	Get(key string) (interface{}, bool)
	Set(key string, value interface{}, ttl time.Duration)
}

type localCache struct {
	cache *cache.Cache
}

func NewLocalCache() LocalCache {
	// TTL de 5 minutos, limpiar cada 10 minutos
	return &localCache{
		cache: cache.New(5*time.Minute, 10*time.Minute),
	}
}

func (c *localCache) Get(key string) (interface{}, bool) {
	return c.cache.Get(key)
}

func (c *localCache) Set(key string, value interface{}, ttl time.Duration) {
	c.cache.Set(key, value, ttl)
}

