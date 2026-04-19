# Directive: Queue Management

## Objective
Manage the daily queue of the barbershop, ensuring correct order, status transitions, and time predictions.

## Inputs
- `Client` data (name, phone)
- `Service` IDs
- Current `QueueState`

## Tools/Scripts
- `src/services/QueueService.ts`
- `src/services/TimePredictorService.ts`

## Edge Cases
- Queue full (`MAX_DAILY_CLIENTS`)
- Client already in queue
- Barber calling next when queue is empty
- Client cancelling their turn
- Barber marking client as absent
