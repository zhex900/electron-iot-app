#!/usr/bin/env bash
ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS | jq -r '.endpointAddress')

node dist/index.js \
        --endpoint $ENDPOINT \
        --ca_file ../infra/AmazonRootCA1.pem \
        --cert ../infra/claim.cert.pem \
        --key ../infra/claim.private.key \
        --template_name fleet-provisioning-template \
        --template_parameters "{\"DeviceId\":\"611908202515\"}"