#!/bin/bash
#
# Copyright 2019 Telefonica Investigación y Desarrollo, S.A.U
#
# This file is part of iotagent-manager
#
# iotagent-manager is free software: you can redistribute it and/or
# modify it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the License,
# or (at your option) any later version.
#
# iotagent-manager is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public
# License along with iotagent-manager. If not, see http://www.gnu.org/licenses/.
#
# For those usages not covered by the GNU Affero General Public License please contact
# with iot_support at tid dot es
#

# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		echo >&2 "error: both $var and $fileVar are set (but are exclusive)"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}


if [[  -z "$PM2_ENABLED" ]]; then
    echo "INFO: IoT Agent running standalone"
    node /opt/iotaManager/bin/iota-manager
else
    echo "***********************************************"
    echo "INFO: IoT Agent Manager encapsulated by pm2-runtime see https://pm2.io/doc/en/runtime/integration/docker/"
    echo "***********************************************"
    pm2-runtime /opt/iotaManager/bin/iota-manager
fi
