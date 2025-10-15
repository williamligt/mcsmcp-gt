@description('The location used for all deployed resources')
param location string = resourceGroup().location

@description('Tags that will be applied to all resources')
param tags object = {}

param wismoMcpExists bool

@description('Id of the user or app to assign application roles')
param principalId string

param logAnalyticsName string
param applicationInsightsName string
param containerRegistryName string
param containerAppsEnvironmentName string
param identityName string
param containerAppName string

var abbrs = loadJsonContent('./abbreviations.json')

// Monitor application with Azure Monitor
module monitoring 'br/public:avm/ptn/azd/monitoring:0.1.0' = {
  name: 'monitoring'
  params: {
    logAnalyticsName: logAnalyticsName
    applicationInsightsName: applicationInsightsName
    applicationInsightsDashboardName: '${abbrs.portalDashboards}${uniqueString(subscription().id, resourceGroup().id, location)}'
    location: location
    tags: tags
  }
}
// Container registry
module containerRegistry 'br/public:avm/res/container-registry/registry:0.1.1' = {
  name: 'registry'
  params: {
    name: containerRegistryName
    location: location
    tags: tags
    publicNetworkAccess: 'Enabled'
    roleAssignments:[
      {
        principalId: wismoMcpIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
        roleDefinitionIdOrName: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
      }
    ]
  }
}

// Container apps environment
module containerAppsEnvironment 'br/public:avm/res/app/managed-environment:0.4.5' = {
  name: 'container-apps-environment'
  params: {
    logAnalyticsWorkspaceResourceId: monitoring.outputs.logAnalyticsWorkspaceResourceId
    name: containerAppsEnvironmentName
    location: location
    zoneRedundant: false
  }
}

module wismoMcpIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.2.1' = {
  name: 'wismoMcpIdentity'
  params: {
    name: identityName
    location: location
  }
}
module wismoMcpFetchLatestImage './modules/fetch-container-image.bicep' = {
  name: 'wismoMcp-fetch-image'
  params: {
    exists: wismoMcpExists
    name: containerAppName
  }
}

module wismoMcp 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'wismoMcp'
  params: {
    name: containerAppName
    ingressTargetPort: 3000
    scaleMinReplicas: 1
    scaleMaxReplicas: 10
    secrets: {
      secureList:  [
      ]
    }
    containers: [
      {
        image: wismoMcpFetchLatestImage.outputs.?containers[?0].?image ?? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
        name: 'main'
        resources: {
          cpu: json('0.5')
          memory: '1.0Gi'
        }
        env: [
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: monitoring.outputs.applicationInsightsConnectionString
          }
          {
            name: 'AZURE_CLIENT_ID'
            value: wismoMcpIdentity.outputs.clientId
          }
          {
            name: 'PORT'
            value: '3000'
          }
        ]
      }
    ]
    managedIdentities:{
      systemAssigned: false
      userAssignedResourceIds: [wismoMcpIdentity.outputs.resourceId]
    }
    registries:[
      {
        server: containerRegistry.outputs.loginServer
        identity: wismoMcpIdentity.outputs.resourceId
      }
    ]
    environmentResourceId: containerAppsEnvironment.outputs.resourceId
    location: location
    tags: union(tags, { 'azd-service-name': 'wismo-mcp' })
  }
}
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_RESOURCE_WISMO_MCP_ID string = wismoMcp.outputs.resourceId
