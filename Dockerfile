FROM centos:6

RUN yum update -y && yum install -y wget \
  && wget http://dl.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm && yum localinstall -y --nogpgcheck epel-release-6-8.noarch.rpm \
  && yum install -y npm git

COPY . /opt/iotaManager
WORKDIR /opt/iotaManager
RUN npm install

ENTRYPOINT bin/iota-manager config.js