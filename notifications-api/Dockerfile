FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY . .

RUN go env -w GONOSUMDB="*" GOFLAGS="-mod=mod" && \
    go mod download && \
    CGO_ENABLED=0 GOOS=linux go build -o /app/notifications-api ./main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/notifications-api .

CMD ["./notifications-api"]
