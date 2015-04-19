var gulp = require('gulp');
var runSequence = require('run-sequence');
var AWS = require('aws-sdk');
var shell = require('gulp-shell');
var env = require('gulp-env');
var awspublish = require('gulp-awspublish');
var gutil = require('gulp-util');
var microDefinition = require('./microserviceDefinition.json');

var validateMicroDefinition = function (err) {
    if (!microDefinition) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microserviceDefinition.json does not exist'));
        return err('microserviceDefinition.json does not exist');
    }
    if (!microDefinition.awsCredentialsProfile ){
        gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain awsCredentialsProfile. Using default profile'));
        microDefinition.awsCredentialsProfile = 'default';
        //return err('microservice definition does not contain awsCredentialsProfile');
    }
    if (!microDefinition.elasticbeanstalk.ebAppName) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain ebAppName'));
        return err('microservice definition does not contain ebAppName');
    }
    if (!microDefinition.elasticbeanstalk.ebEnvName) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain ebEnvName'));
        return err('microservice definition does not contain ebEnvName');
    }
    if (!microDefinition.elasticbeanstalk.region) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain region'));
        return err('microservice definition does not contain region');
    }
    if (!microDefinition.s3.bucket) {
        //gutil.log(gutil.colors.red('[INVALID CONFIG]: microservice definition does not contain s3.bucket'));
        return err('microservice definition does not contain s3.bucket');
    }

    gutil.log(gutil.colors.green.inverse('[VALID CONFIG]:\n' + JSON.stringify(microDefinition, null, '\t')));
}

var awsCreds = new AWS.Credentials({
    sslEnabled: true,
    maxRetries: 10,
    maxRedirects: 10
});

var packageFileVersion = function () {
    delete require.cache[require.resolve('./package.json')]; //uncache the module
    return require('./package.json').version;
}
var archiveName = function (extension) {
    return microDefinition.elasticbeanstalk.ebAppName + '_v' + packageFileVersion() + extension;
}

var ebs; // Elastic Beanstalk SDK interface

gulp.task('setup-ebs', ['setup-aws-env'], function (done) {
    ebs = new AWS.ElasticBeanstalk(
        options = {
            //credentials: awsCreds,
            region: microDefinition.elasticbeanstalk.region
        },
        {
            apiVersion: '2010-12-01'
        }
    );
    done();
});
//
// AWS.ElasticBeanstalk utility functions
//
gulp.task('createEbApp', ['setup-ebs'], function (done) {
    var app_params = {
        ApplicationName: microDefinition.elasticbeanstalk.ebAppName, /* required */
        Description: microDefinition.ebAppDesc
    };
    createEbApp(ebs, app_params, done)
});

var createEbApp = function (ebs, appOpts, done) {
    req = ebs.createApplication(appOpts, function (err, data) {
        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
    }).on('success', function (response) {
        gutil.log(gutil.colors.green('[SUCCESS]:' + JSON.stringify(response.data)));
    }).on('error', function (response, err) {
        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
    });
};


gulp.task('deploy-app', ['setup-ebs'], function (done) {
    var appParams = {
        ApplicationName: microDefinition.elasticbeanstalk.ebAppName, /* required */
        VersionLabel: packageFileVersion(), /* required */
        Description: packageFileVersion(),
        SourceBundle: {
            S3Bucket: microDefinition.s3.bucket,
            S3Key: archiveName('.zip')
        }
    };
    createAppVersion(appParams, done)
});

var createAppVersion = function (appVer, done) {
    gutil.log(gutil.colors.yellow('[DEBUG]:\n' + JSON.stringify(appVer)));
    req = ebs.createApplicationVersion(appVer, function (err, data) {
        if (err) {
            gutil.log(gutil.colors.red('[FAILED]:\n' + err, err.stack)); // an error occurred
        }
        else {
            gutil.log(gutil.colors.green('[SUCCESS]:\n' + data)); // an error occurred
        }
        done();
    });
};

gulp.task('app-bucket', ['setup-aws-env'], function (done) {
    createAppBucket(microDefinition.s3.bucket);
    done();
});
var createAppBucket = function (name, done) {
    var params = {
        Bucket: name, /* required */
        ACL: 'authenticated-read'
    };

    var s3 = new AWS.S3();
    s3.createBucket({Bucket: name}, function (err, data) {
        //gutil.log(gutil.colors.yellow('[DEBUG]: s3data=' ), data);
        if (err) {
            if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
        }
        return data.Location;
    }).on('success', function (response) {
        gutil.log(gutil.colors.green('[SUCCESS]:' + "Created bucket at "),
            gutil.colors.blue(JSON.stringify(response.data)))
    }).on('error', function (response, err) {
        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
    });
};
gulp.task('update-eb-env', ['setup-ebs'], function (done) {
    var params = {
        EnvironmentName: microDefinition.elasticbeanstalk.ebEnvName, /* required */
        VersionLabel: packageFileVersion(),
        Description: 'updated with ' + packageFileVersion()
    };
    updateEnvironment(ebs, params, done);

});
var updateEnvironment = function (eb, env, done) {
    gutil.log(gutil.colors.yellow('[DEBUG]:\n' + JSON.stringify(env)));
    eb.updateEnvironment(env, function (err, data) {
        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
    }).on('success', function (response) {
        gutil.log(gutil.colors.green('[SUCCESS]:' + JSON.stringify(response.data)));
    }).on('error', function (response, err) {
        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
    });
    done();
};
gulp.task('eb-deploy', ['setup-ebs'], function (done) {
    var env_params = {
        EnvironmentId: 'e-pxzcf3p5yta',
        EnvironmentName: 'ocapimyhapi-enva'
    };
    ebs.describeEnvironmentResources(env_params, function (err, data) {
        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
    }).on('success', function (response) {
        gutil.log(gutil.colors.green('[SUCCESS]:' + JSON.stringify(response.data)));
    }).on('error', function (response, err) {
        gutil.log(gutil.colors.red('[FAILURE]:' + JSON.stringify(response)));
    });

    var envopt_params = {
        ApplicationName: 'ocapimyhapi1',
        EnvironmentName: 'ocapimyhapi-env1'
    };

    ebs.describeConfigurationSettings(envopt_params, function (err, data) {
        if (err)  gutil.log(gutil.colors.magenta('[STACKTRACE]:' + err, err.stack)); // an error occurred
    })


    var app_params = {
        ApplicationName: 'test_docker_node_app', /* required */
        Description: 'Testing creation of a docker node app'
    };

    // createEbApp(ebs,app_params, done)

    //var desc_params = {
    //    ApplicationNames: [
    //        'test_docker_node_app', /* required */
    //    ]
    //};
    //ebs.describeApplications(desc_params, function(err, data) {
    //    if (err) console.log(err, err.stack); // an error occurred
    //    else     console.log(data);           // successful response
    //});
});

gulp.task('setup-aws-env', function (done) {

    validateMicroDefinition(function (err) {
        if (err) {
            gutil.log(gutil.colors.red('[ERROR]: ' + err));
        } else {

            env({
                vars: {
                    AWS_PROFILE: microDefinition.awsCredentialsProfile,
                    NODE_ENV: 'developmenet'
                }
            })

            var credentials = new AWS.SharedIniFileCredentials({profile: microDefinition.awsCredentialsProfile});
            AWS.config.credentials = credentials;
            AWS.config.update({region: 'us-east-1'});

            var arch = archiveName('.zip');
            //dconsole.log('arch=' + arch);

            var tasks = [];
            tasks.push('echo NODE_ENV = $NODE_ENV');
            tasks.push('echo AWS_PROFILE = $AWS_PROFILE');
            shell.task(tasks)();
            //gutil.log(gutil.colors.yellow('[DEBUG]: env =' + JSON.stringify(process.env)));
            done();
        }

    });
});

gulp.task('pub', ['setup-aws-env'], function (done) {
    gutil.log(gutil.colors.yellow('[DEBUG]: definition =' + JSON.stringify(microDefinition.s3.bucket)));
    var publisher = awspublish.create({bucket: microDefinition.s3.bucket});
    console.log(JSON.stringify(publisher));
    gutil.log(gutil.colors.yellow('[DEBUG]: archive =' + archiveName('.zip')));
    gulp.src(archiveName('.zip')).pipe(publisher.publish()).pipe(awspublish.reporter());
    done();
});


