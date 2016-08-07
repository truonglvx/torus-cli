'use strict';

var Promise = require('es6-promise').Promise;

var cpath = require('common/cpath');
var cValue = require('./value');

var credentials = exports;

function getPath(user, params) {
  return '/' + [
    params.org, // default to the users org
    params.project,
    params.environment,
    params.service,
    user.body.username,
    params.instance // default to instance id 1
  ].join('/');
}

credentials.create = function (api, params, value) {
  return new Promise(function (resolve, reject) {
    if (!(value instanceof cValue.CredentialValue)) {
      throw new Error('value must be provided');
    }
    if (!params.name ||
        (!params.path &&
         (!params.org || !params.project || !params.service ||
          !params.environment || !params.instance))) {
      throw new Error('Invalid parameters provided');
    }

    if (params.path && !cpath.validateExp(params.path)) {
      throw new Error('Invalid path provided');
    }

    var cpathObj;
    if (params.path) {
      cpathObj = cpath.parseExp(params.path);
    }

    var projectName = (cpathObj) ? cpathObj.project : params.project;
    var orgName = (cpathObj) ? cpathObj.org : params.org;
    return Promise.all([
      api.users.self(),
      api.orgs.get({ name: orgName })
    ]).then(function (results) {
      var user = results[0];
      var org = results[1] && results[1][0];

      if (!user) {
        return reject(new Error('Could not find the user'));
      }

      if (!org) {
        return reject(new Error('Unknown org: ' + orgName));
      }

      var qs = { name: projectName, org_id: org.id };
      return api.projects.get(qs).then(function (result) {
        var project = result[0];
        if (!project) {
          return reject(new Error('Unknown project: ' + projectName));
        }

        var pathexp = (cpathObj) ?
          cpathObj.toString() : getPath(user, params);

        var data = {
          name: params.name,
          project_id: project.id,
          org_id: org.id,
          pathexp: pathexp,
          value: value.toString()
        };

        return api.credentials.create(data);
      });
    })
    .then(resolve)
    .catch(reject);
  });
};

credentials.get = function (api, params) {
  return new Promise(function (resolve, reject) {
    if (!params.project || !params.service || !params.environment ||
        !params.instance || !params.org) {
      throw new Error(
        'Org, project, service, environment, and instance must be provided');
    }

    return Promise.all([
      api.users.self(),
      api.orgs.get({ name: params.org })
    ]).then(function (results) {
      var user = results[0];
      var org = results[1] && results[1][0];

      if (!user) {
        return reject(new Error('Could not find user'));
      }

      if (!org) {
        return reject(new Error('Could not find the org: ' + params.org));
      }

      var path = '/' + [
        org.body.name,
        params.project,
        params.environment,
        params.service,
        user.body.username,
        params.instance
      ].join('/');

      return api.credentials.get({ path: path });
    })
    .then(resolve)
    .catch(reject);
  });
};
