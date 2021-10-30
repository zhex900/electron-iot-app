/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */

import {mqtt, iotidentity} from 'aws-iot-device-sdk-v2';

type Args = { [index: string]: any };
const yargs = require('yargs');
const common_args = require('../cli_args');

yargs.command('*', false, (yargs: any) => {
    common_args.add_connection_establishment_arguments(yargs);
    yargs
        .option('csr_file', {
            alias: 'csr',
            description: 'FILE: Path to a CSR file in PEM format',
            type: 'string',
            required: false
        })
        .option('template_name', {
            alias: 't',
            description: 'STRING: Template Name',
            type: 'string',
            required: true
        })
        .option('template_parameters', {
            alias: 'tp',
            description: 'Template parameters json ',
            type: 'string',
            required: false
        })
}, main).parse();


async function execute_keys(identity: iotidentity.IotIdentityClient, argv: Args) {
    return new Promise(async (resolve, reject) => {
        try {
            function keysAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.CreateKeysAndCertificateResponse) {
                if (response) {
                    console.log("CreateKeysAndCertificateResponse for certificateId=" + response.certificateId);
                }

                if (error || !response) {
                    console.log("Error occurred..");
                    reject(error);
                } else {
                    resolve(response.certificateOwnershipToken);
                }
            }

            function keysRejected(error?: iotidentity.IotIdentityError, response?: iotidentity.model.ErrorResponse) {
                if (response) {
                    console.log("CreateKeysAndCertificate ErrorResponse for " +
                        " statusCode=:" + response.statusCode +
                        " errorCode=:" + response.errorCode +
                        " errorMessage=:" + response.errorMessage);
                }
                if (error) {
                    console.log("Error occurred..");
                }
                reject(error);
            }

            console.log("Subscribing to CreateKeysAndCertificate Accepted and Rejected topics..");

            const keysSubRequest: iotidentity.model.CreateKeysAndCertificateSubscriptionRequest = {};

            await identity.subscribeToCreateKeysAndCertificateAccepted(
                keysSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => keysAccepted(error, response));

            await identity.subscribeToCreateKeysAndCertificateRejected(
                keysSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => keysRejected(error, response));

            console.log("Publishing to CreateKeysAndCertificate topic..");
            const keysRequest: iotidentity.model.CreateKeysAndCertificateRequest = {
                toJSON() {
                    return {};
                }
            };

            await identity.publishCreateKeysAndCertificate(
                keysRequest,
                mqtt.QoS.AtLeastOnce);
        } catch (error) {
            reject(error);
        }
    });
}

async function execute_register_thing(identity: iotidentity.IotIdentityClient, token: string, argv: Args) {
    return new Promise(async (resolve, reject) => {
        try {
            function registerAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.RegisterThingResponse) {
                if (response) {
                    console.log("RegisterThingResponse for thingName=" + response.thingName);
                }

                if (error) {
                    console.log("Error occurred..");
                }
                resolve(1);
            }

            function registerRejected(error?: iotidentity.IotIdentityError, response?: iotidentity.model.ErrorResponse) {
                if (response) {
                    console.log("RegisterThing ErrorResponse for " +
                        "statusCode=:" + response.statusCode +
                        "errorCode=:" + response.errorCode +
                        "errorMessage=:" + response.errorMessage);
                }
                if (error) {
                    console.log("Error occurred..");
                }
                resolve(1);
            }

            console.log("Subscribing to RegisterThing Accepted and Rejected topics..");
            const registerThingSubRequest: iotidentity.model.RegisterThingSubscriptionRequest = {templateName: argv.template_name};
            await identity.subscribeToRegisterThingAccepted(
                registerThingSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => registerAccepted(error, response));

            await identity.subscribeToRegisterThingRejected(
                registerThingSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => registerRejected(error, response));

            console.log("Publishing to RegisterThing topic..");
            const map: { [key: string]: string } = JSON.parse(argv.template_parameters);

            console.log("token=" + token);

            const registerThing: iotidentity.model.RegisterThingRequest = {
                parameters: map,
                templateName: argv.template_name,
                certificateOwnershipToken: token
            };
            await identity.publishRegisterThing(
                registerThing,
                mqtt.QoS.AtLeastOnce);
        } catch (error) {
            reject(error);
        }
    });
}

async function main(argv: Args) {
    common_args.apply_sample_arguments(argv);

    const connection = common_args.build_connection_from_cli_args(argv);

    const identity = new iotidentity.IotIdentityClient(connection);

    // force node to wait 60 seconds before killing itself, promises do not keep node alive
    const timer = setTimeout(() => {
    }, 60 * 1000);

    await connection.connect();

    //Keys workflow
    const token = await execute_keys(identity, argv);
    await execute_register_thing(identity, token as string, argv);

    await connection.disconnect();
    // Allow node to die if the promise above resolved
    clearTimeout(timer);
}