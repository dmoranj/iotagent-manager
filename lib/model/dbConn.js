/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-manager
 *
 * iotagent-manager is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-manager is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-manager.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

/**
 * This module sets up the connection with the mongodb through mongoose. This connection will be used
 * in mongoose schemas to persist objects.
 */

var mongoose = require('mongoose'),
    config = require('../utils/commonConfig'),
    constants = require('../utils/constants'),
    logger = require('logops'),
    async = require('async'),
    errors = require('../errors'),
    defaultDb,
    DEFAULT_DB_NAME = 'iotagent-manager',
    context = {
        op: 'IoTAManager.DbConn'
    };

function loadModels() {
    require('./Protocol').load(defaultDb);
    require('./Configuration').load(defaultDb);
}

/**
 * Creates a new connection to the Mongo DB.
 *
 * @this Reference to the dbConn module itself.
 */
function init(host, db, port, username, password, options, callback) {
    /*jshint camelcase:false, validthis:true */
    var hosts,
        url,
        credentials = '',
        retries = 0,
        lastError,
        maxRetries = (config.getConfig().mongodb && config.getConfig().mongodb.retries ||
            constants.DEFAULT_MONGODB_RETRIES);

    if (username && password) {
        credentials = username + ':' + password + '@';
    }

    function addPort(item) {
        return item + ':' + port;
    }

    function commaConcat(previous, current, currentIndex) {
        if (currentIndex !== 0) {
            previous += ',';
        }

        previous += current;

        return previous;
    }

    hosts = host.split(',')
        .map(addPort)
        .reduce(commaConcat, '');

    url = 'mongodb://' + credentials + hosts + '/' + db;

    function createConnectionHandler(error, results) {
        if (defaultDb) {
            logger.info('Successfully connected to MongoDB.');
            module.exports.db = defaultDb;
            loadModels();
        } else {
            logger.error('Error found after [%d] attempts: %s', retries, error || lastError);
        }

        callback(error);
    }

    function retryCheck() {
        return !defaultDb && retries < maxRetries;
    }

    function connectionAttempt(url, options, callback) {
        var candidateDb;

        logger.info(context, 'Attempting to connect to MongoDB instance. Attempt %d', retries);

        candidateDb = mongoose.createConnection(url, options, function(error, result) {
            if (error) {
                logger.error(context, 'Error trying to connect to MongoDB: %s', error);
                lastError = error;
            } else {
                defaultDb = candidateDb;
            }

            callback();
        });
    }

    function tryCreateConnection(callback) {
        var attempt = async.apply(connectionAttempt, url, options, callback),
            seconds = (config.getConfig().mongodb && config.getConfig().mongodb.retryTime ||
                constants.DEFAULT_MONGODB_RETRY_TIME);

        retries++;

        if (retries === 1) {
            logger.info(context, 'First connection attempt');
            attempt();
        } else {
            logger.info(context, 'Waiting %d seconds before attempting again.', seconds);
            setTimeout(attempt, seconds * 1000);
        }
    }

    defaultDb = null;
    async.whilst(retryCheck, tryCreateConnection, createConnectionHandler);
}

function configureDb(callback) {
    /*jshint camelcase:false, validthis:true */
    var currentConfig = config.getConfig();

    if (!currentConfig.mongodb || !currentConfig.mongodb.host) {
        logger.fatal(context, 'No host found for MongoDB driver.');
        callback(new errors.BadConfiguration('No host found for MongoDB driver'));
    } else {
        var dbName = currentConfig.mongodb.db,
            port = currentConfig.mongodb.port || 27017,
            options = {};

        if (!currentConfig.mongodb.db) {
            dbName = DEFAULT_DB_NAME;
        }

        if (currentConfig.mongodb.replicaSet) {
            options.replset = { rs_name: currentConfig.mongodb.replicaSet };
        }

        init(config.getConfig().mongodb.host, dbName, port,
            currentConfig.username, currentConfig.password, {}, callback);
    }
}

exports.configureDb = configureDb;
exports.db = defaultDb;
exports.DEFAULT_DB_NAME = DEFAULT_DB_NAME;
