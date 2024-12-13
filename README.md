# Welcome to your CDK JavaScript project

The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

To get started with this project please follow the following prerequisites:

1. Install Node Version = 18.0
2. Change directory to project root
3. Create symLink -> ln -s layer/nodejs/package-lock.json ./package-lock.json && ln -s layer/nodejs/package-lock.json ./package-lock.json
4. Run npm ci in layer/nodejs folder and at project root
5. Create ZIP file of nodejs folder inside layer folder
6. Create your AWS Profile with credentials
7. run cdk bootstrap --profile <profile_name> 
8. run cdk deploy --profile <profile_name> 
9. Verify the API Gateway URL provided on console by appending "/tasks"
10. run cdk destroy --profile <profile_name> to destroy the set up
