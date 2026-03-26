# Directive: Time Prediction (EWMA)

## Objective
Calculate the estimated service time for a client based on their individual history using the Exponentially Weighted Moving Average (EWMA) algorithm.

## Formula
`novaMedia = α × duracaoReal + (1 - α) × mediaAnterior`
- `α = 0.3` (default)
- `mediaAnterior` = client's stored `tempoMedio`

## Inputs
- `duracaoReal` (minutes)
- `mediaAnterior` (minutes)
- `EWMA_ALPHA` (from config)

## Tools/Scripts
- `src/services/TimePredictorService.ts`

## Edge Cases
- New client (no history): Use `tempoBase × NEW_CLIENT_MULTIPLIER`
- First service ever: Use `tempoBase`
- Outlier durations (e.g., 5 min or 2 hours): Consider capping or logging.
