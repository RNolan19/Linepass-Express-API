#!/bin/bash

API="http://localhost:4741"
URL_PATH="/bars"

curl "${API}${URL_PATH}" \
  --include \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${TOKEN}" \
  --data '{
    "bar": {
      "name": "'"${NAME}"'",
      "city": "'"${CITY}"'",
      "address": "'"${ADDRESS}"'",
      "price": "'"${PRICE}"'"
    }
  }'

echo
