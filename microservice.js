var gutil = require('gulp-util');
var microserviceDefinition = require('./microserviceDefinition.json'); // Load configuration file
/**
 * export the microservice properites
 */
var validateMicroDefinition = function (err) {
    if (!microserviceDefinition) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microserviceDefinition.json does not exist'));
        return err('microserviceDefinition.json does not exist');
    }
    else if (!microserviceDefinition.awsCredentialsProfile) {
        gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain awsCredentialsProfile. Using default profile'));
        microserviceDefinition.awsCredentialsProfile = 'default';
        //return err('microservice definition does not contain awsCredentialsProfile');
    }
    else if (!microserviceDefinition.elasticbeanstalk || !microserviceDefinition.elasticbeanstalk.ebAppName) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain ebAppName'));
        return err('microservice definition does not contain ebAppName');
    }
    else if (!microserviceDefinition.elasticbeanstalk.ebEnvName) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain ebEnvName'));
        return err('microservice definition does not contain ebEnvName');
    }
    else if (!microserviceDefinition.elasticbeanstalk.region) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain region'));
        return err('microservice definition does not contain region');
    }
    else if (!microserviceDefinition.s3 || !microserviceDefinition.s3.bucket) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain s3.bucket'));
        return err('microservice definition does not contain s3.bucket');
    }
    else {
        gutil.log(gutil.colors.green.inverse('[MICROSERVICE CONFIG]:\n' + JSON.stringify(microserviceDefinition, null, '\t')));
    }
}
/**
 * Dynamically reload the version number from the package.json incase the version has been bumped since it was loaded
 * @returns version number from package.json
 */
var packageFileVersion = function () {
    delete require.cache[require.resolve('./package.json')]; //uncache the module
    return require('./package.json').version;
};
/**
 * Generate archive name for current version from microservice configuration with provided extension appended
 * @returns name with extension of the archive file associated with the current version
 */
var archiveName = function (extension) {
    return microserviceDefinition.elasticbeanstalk.ebAppName + '_v' + packageFileVersion() + extension;
}

//Call to validate immediately whenever this is loaded
validateMicroDefinition(function (err) {
    if (err) {
        gutil.log(gutil.colors.red.inverse('[INVALID CONFIG]: microservice definition does ', err));
        return err
    }
});

/**
 * Exports
 */
module.exports.definition = microserviceDefinition;
module.exports.version = packageFileVersion;
module.exports.archiveName = archiveName;
