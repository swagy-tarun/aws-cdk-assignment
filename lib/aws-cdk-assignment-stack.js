const cdk = require('aws-cdk-lib');
const { Stack } = cdk;

const lambda = require('aws-cdk-lib/aws-lambda');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const path = require('path');
// const sqs = require('aws-cdk-lib/aws-sqs');


class AwsCdkAssignmentStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const taskDbTable = new dynamodb.Table(this, 'TaskTable', {
      partitionKey: {name: 'taskId', type: dynamodb.AttributeType.STRING},
      tableName: 'TaskTable',
      readCapacity: 5,
      writeCapacity: 5,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    taskDbTable.addGlobalSecondaryIndex({
      indexName: 'taskStatusIndex',
      partitionKey: {name: 'status', type: dynamodb.AttributeType.STRING},
      projectionType: dynamodb.ProjectionType.ALL
    })

    const layer = new lambda.LayerVersion(this, 'TaskLambdaLayer', {
      code: lambda.Code.fromAsset('layer/nodejs.zip'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'A layer for AWS SDK and other dependencies',
    });

    const taskLambda = new lambda.Function(this, 'TaskCrudLambda', {
      runtime: lambda.Runtime.NODEJS_18_X, 
      code: lambda.Code.fromAsset('src/lambda'),
      layers: [layer],
      handler: 'index.handler',
      environment: {
        TASK_TABLE: taskDbTable.tableName
      }
    }) 

    const api = new apigateway.RestApi(this, 'TaskApi', {
      restApiName: 'CRUD Task Service',
      description: 'API for performing CRUD operations on Task Table in dynamoDb',
    });

    const requestBodySchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string'},
        status: { type: 'string'},
      },
      required: ['title', 'description', 'status'],
    };

    const model = new apigateway.Model(this, 'RequestModel', {
      restApi: api,
      contentType: 'application/json',
      schema: requestBodySchema,
    });

    const validator = new apigateway.RequestValidator(this, 'RequestValidator', {
      restApi: api,
      validateRequestBody: true
    });

    // Define API Endpoints
    const tasks = api.root.addResource('tasks');
    tasks.addMethod('POST', new apigateway.LambdaIntegration(taskLambda), {
      requestValidator: validator,
      requestModels: {
        'application/json': model,
      },
    }); // Create
    const task = tasks.addResource('{taskId}');
    task.addMethod('GET', new apigateway.LambdaIntegration(taskLambda)); // Read
    task.addMethod('PUT', new apigateway.LambdaIntegration(taskLambda), {
      requestValidator: validator,
      requestModels: {
        'application/json': model,
      },
    }); // Update
    task.addMethod('DELETE', new apigateway.LambdaIntegration(taskLambda)); // Delete

    taskDbTable.grantReadWriteData(taskLambda)
    //taskLambda.grantInvokeUrl(api)
  
  }

    // example resource
    // const queue = new sqs.Queue(this, 'AwsCdkAssignmentQueue', {
    //   visibilityTimeout: Duration.seconds(300)
    // });
}

module.exports = { AwsCdkAssignmentStack }
