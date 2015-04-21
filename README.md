Node Elastic Beanstalk Docker Deployment via aws-sdk
=================================
Sample project to test how to use **aws-sdk** to deploy a node application with Docker to Elastic Beanstalk.

>##Local Installation

1. Clone repo
2. Node / NPM developed & tested locally on v0.10.36, might work on higher (but not guaranteed).
3. Change directory to repo
  
  ```cd node_beanstalk_docker_deploy```
  
>## Setup credentials

1. TBD
  
  ```
  tbd
  ```
  
>## Setup Elastic Beanstalk environment 

1. TBD
  
  ```
  TBD
  ```
  
>## Configure your microservice

1. edit microserviceDefinition.json 

  ```
   {
      "comment": "This document describes the microservice being deployed to elastic beanstalk. It should be created by the microservice developer at the time they wish to begin deploying this microservice to run on aws elasticbeanstalk.",
      "name":"Local name for microservice",
      "desc":"Description of microservice",
      "awsCredentialsProfile" :"credentials profile you want to use for this (use default if you didn't setup another profile",
      "elasticbeanstalk": {
          "ebAppName": "Name in elastic beanstalk for your application(if created via console, must exactly match AWS console",
          "ebAppDesc": "Description of you application",
          "ebEnvName": "Name in elastic beanstalk of the environment you created for this application, must exactly match AWS console",
          "region":"aws region your application is created in e.g 'us-east-1'"
      },
      "s3": {
          "bucket": "Name of s3 bucket to use or create. There may be an issue using '-' or '_' in this name."
      }
  }
  ```
 
 
>## Deploying a new version to elastic beanstalk
When you are ready to create a new version of the application these gulp tasks will: update the version number in the package.json, stage the files for deployment, zip the deployment package, create an S3 bucket and upload the zip archive containing the release version, create a new version of the application with Elastic Beanstalk, deploy the new version to the associated Elastic Beanstalk environment

1. Update the version number in the package.json, stage the files for deployment, zip the deployment package

  ```
  gulp stage
  ```
2.Create an S3 bucket and upload the zip archive containing the release version, create a new version of the application with Elastic Beanstalk, deploy the new version to the associated Elastic Beanstalk environment

  ```
  gulp eb-deploy 
  ```
