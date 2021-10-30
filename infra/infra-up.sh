#!/usr/bin/env bash

APP=electron-iot-app
AWS_ACCOUNT=
AWS_REGION=
FLEET_PROVISIONING_TEMPLATE=fleet-provisioning-template
FLEET_PROVISIONING_ROLE=role-fleet-provisioning-template

# Mac OS only syntax
sed -i '.bak' "s/AWS_ACCOUNT/$AWS_ACCOUNT/g" birth-policy.json full-citizen-policy.json
sed -i '.bak' "s/AWS_REGION/$AWS_REGION/g" birth-policy.json full-citizen-policy.json
sed -i '.bak' "s/FLEET_PROVISIONING_TEMPLATE/$FLEET_PROVISIONING_TEMPLATE/g" birth-policy.json full-citizen-policy.json

aws iot create-policy \
  --policy-name full-citizen-policy \
  --policy-document file://full-citizen-policy.json | jq

aws iot create-policy \
  --policy-name birth-policy \
  --policy-document file://birth-policy.json | jq

aws iam create-role \
  --role-name $FLEET_PROVISIONING_ROLE \
  --assume-role-policy-document \
  '{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"iot.amazonaws.com"}}]}' | jq

aws iam attach-role-policy \
  --role-name $FLEET_PROVISIONING_ROLE \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSIoTThingsRegistration | jq

# wait for the role to be created
sleep 10

aws iot create-provisioning-template \
  --template-name $FLEET_PROVISIONING_TEMPLATE \
  --provisioning-role-arn arn:aws:iam::"$AWS_ACCOUNT":role/"$FLEET_PROVISIONING_ROLE" \
  --template-body file://fleet-provisioning-template.json \
  --enabled | jq

CERTIFICATE_ARN=$(aws iot create-keys-and-certificate --set-as-active \
  --certificate-pem-outfile "claim.cert.pem" \
  --public-key-outfile "claim.public.key" \
  --private-key-outfile "claim.private.key" | jq '.certificateArn')

aws iot attach-policy --policy-name birth-policy --target "$CERTIFICATE_ARN"

curl -O https://www.amazontrust.com/repository/AmazonRootCA1.pem

#aws iam detach-role-policy --role-name $FLEET_PROVISIONING_ROLE --policy-arn arn:aws:iam::aws:policy/service-role/AWSIoTThingsRegistration | jq
#aws iam delete-role --role-name $FLEET_PROVISIONING_ROLE | jq
#aws iot delete-provisioning-template --template-name $FLEET_PROVISIONING_TEMPLATE | jq
#aws iot delete-policy --policy-name full-citizen-policy
#aws iot delete-policy --policy-name birth-policy
