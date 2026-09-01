# scout-local-registry

Polls configured Secretary of State business registry and municipal permit
portal search endpoints for records matching watched subjects, and POSTs
matches to the Silent Legacy Make.com pipeline. Primary feeder for
`Legacy: Proof` and the "Public Record Lock" anti-scam check.

Registry search APIs are not standardized across states/municipalities, so
each source is configured generically in the `registries` input array
rather than hard-coded — point it at whatever JSON search endpoint a given
state SOS or city permit portal exposes.

## Input

See [`input_schema.json`](./input_schema.json). Each entry in `registries`:

```json
{
  "name": "example-state-sos",
  "watchTerms": ["Example Holdings LLC"],
  "urlTemplate": "https://example-sos.gov/api/search?name={term}",
  "resultsPath": "results",
  "type": "business-registry"
}
```

- `urlTemplate` — `{term}` is replaced with each URL-encoded watch term.
- `resultsPath` — dot-path to the results array in the JSON response
  (omit if the response body *is* the array).
- `type` — `business-registry` or `permit`, passed through on the output
  payload.

## Output payload

```json
{
  "source": "local-registry",
  "registryType": "business-registry",
  "registryName": "example-state-sos",
  "watchTerm": "Example Holdings LLC",
  "record": { "...": "raw record as returned by the registry" }
}
```

## Dedup

Seen record IDs are stored in the actor's key-value store under
`SEEN_RECORDS` across runs.
