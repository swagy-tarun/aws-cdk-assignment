const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const dynamo = new AWS.DynamoDB.DocumentClient();
const TASK_TABLE = process.env.TASK_TABLE;

const schemaValidator = Joi.object({
    title: Joi.string().min(10).max(50).required(),
    description: Joi.string().min(10).max(200).required(),
    status: Joi.string().valid('pending', 'completed', 'in-progress').required(),
    taskId: Joi.string().uuid().required()
})

exports.handler = async (event) => {
    const {httpMethod, pathParameters, body} = event;
    const paramTaskId = pathParameters?.taskId;
    const task = JSON.parse(body);
    switch(httpMethod) {
        case 'POST':
            const taskUUID = uuidv4();
            task['taskId'] = taskUUID
            const validationRes = requestBodyValidator(task)
            if (!validationRes.status) {
                return {statusCode: 400, body: JSON.stringify(validationRes.error)}
            }
            task['createdAt'] = new Date().toISOString();
            const postResult = await dynamo.put({ TableName: TASK_TABLE, Item: task}).promise();
            return { statusCode: 201, body: JSON.stringify(postResult['Item']) };
        case 'PUT':
            return updateHelper(paramTaskId, task)     
        case 'GET':
            const result = await getHelper(paramTaskId)
            console.log(result)
            if (!result.Item) {
                return {statusCode: 404}
            }
            return { statusCode: 200, body: JSON.stringify(result['Item']) };    
        case 'DELETE':
            await dynamo.delete({ TableName: TASK_TABLE, Key: { taskId: paramTaskId } }).promise();
            return { statusCode: 204};     
        default:
            return {statusCode: 404, body:JSON.stringify({msg:'HTTP Method Not Found'})}
        }
};

const getHelper = async (taskId) => {
    return await dynamo.get({ TableName: TASK_TABLE, Key: { taskId: taskId } }).promise();
}

const updateHelper = async (taskId, task) => {
    task['taskId'] = taskId
    const validationRes = requestBodyValidator(task)
        if (!validationRes.status) {
            return {statusCode: 400, body: JSON.stringify(validationRes.error)}
    }

    const updateRequest = {
        TableName: TASK_TABLE,
        Key: {taskId: taskId},
        UpdateExpression: 'SET #title=:title, #description=:description, #status=:status, #updatedAt=:updatedAt',
        ExpressionAttributeNames: {
            '#title': 'title',
            '#description': 'description',
            '#status': 'status',
            '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
            ':title': task['title'], 
            ':description': task['description'],
            ':status': task['status'],
            ':updatedAt': new Date().toISOString()
        },
        ConditionExpression: 'attribute_exists(taskId)',
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        const result = await dynamo.update(updateRequest).promise();
        console.log('Update successful:', result.Attributes);
        return {statusCode: 200, body: JSON.stringify(result.Attributes)};
      } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
          console.error('Task does not exist!');
          return {statusCode: 404};
        } else {
          console.error('Error updating item:', error);
          return {statusCode: 503, body: JSON.stringify(error)};
        }
    }
}

const requestBodyValidator = (body) => {
    result = {status: true}
    const { error, value } = schemaValidator.validate(body);
    if (error) {
        console.error("Validation Error:", error.details[0].message);
        result['status'] = false
        result['error'] = error.details
    }

    return result
}
