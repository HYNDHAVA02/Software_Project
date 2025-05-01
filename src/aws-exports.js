const awsConfig = {
    Auth: {
      region: "us-east-1",  // <-- your AWS region
      userPoolId: "us-east-1_LmfixjoQr",  // <-- your Cognito User Pool ID
      userPoolWebClientId: "4l5gqgqhii1hhgn7mf8nppe5b7",  // <-- App Client ID
      mandatorySignIn: true,
      authenticationFlowType: "USER_SRP_AUTH"
    }
  };
  export default awsConfig;
  