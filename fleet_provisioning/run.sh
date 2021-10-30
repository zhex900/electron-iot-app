node dist/index.js \
        --endpoint a29w0hvardstv-ats.iot.ap-southeast-2.amazonaws.com \
        --ca_file ../infra/AmazonRootCA1.pem \
        --cert ../infra/claim.cert.pem \
        --key ../infra/claim.private.key \
        --template_name fleet-provisioning-template \
        --template_parameters "{\"DeviceId\":\"611908202515\"}"