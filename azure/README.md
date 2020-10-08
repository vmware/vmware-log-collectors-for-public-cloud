# vmware-log-collectors-for-azure

## Overview
The project provides an Azure function for collecting Azure services logs
and sending the logs to vRealize log insight cloud - vRLIC.

### Prerequisite
Assuming, that the "Resource Group" is already created, if not please create it.

### Try it out
To try out the project, you need to do two things:
1. Deploy the template of this project in your Azure environment.
    * <b>API_Url</b> : In API_Url field please provide, vRealize Log Insight Cloud API Url.
    * <b>API_Key</b> : In API_Key field please provide, vRealize Log Insight Cloud API Token.
2. Complete configuration based on the template deployed to collect logs from the below Azure services.

The following sections describe the type of deployments are available.

### Blob Storage based log collection
Azure Blob storage is Microsoft's object storage solution for the cloud. Blob storage is optimized for storing massive amounts of unstructured data. Unstructured data is data that doesn't adhere to a particular data model or definition, such as text or binary data.
<br>
Single click automated service deployment is enable to collect logs from Blob Storage. It can be achieved by clicking on following button:<br/>

| Use Existing Blob Storage | Create New Blob Storage |
|---|---|
| [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fvmware%2Fvmware-log-collectors-for-public-cloud%2Fmaster%2Fazure%2Fdeployments%2FblobStorage%2Fazure-template-existing-blob.json) | [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fvmware%2Fvmware-log-collectors-for-public-cloud%2Fmaster%2Fazure%2Fdeployments%2FblobStorage%2Fazure-template-new-blob.json) |
| In this deployment, as Blob Storage is already available in azure environment, we need to configure the existing Blob Storage in newly created function's blob trigger integration. | In this deployment, we will be deploying new Blob Storage, and it will be pre configured in newly created function. |


### Event Hub based log collection
Azure Event Hub is a Big Data streaming platform and event ingestion service, capable of receiving and processing millions of events per second. Event Hubs can process and store events, data, or telemetry produced by distributed software and devices. Data sent to an event hub can be transformed and stored using any real-time analytics provider or batching/storage adapters.
<br>
Single click automated service deployment is enable to collect logs from Event Hub. It be achieved by clicking on following button:<br/>

| Use Existing Event Hub | Create New Event Hub |
|---|---|
| [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fvmware%2Fvmware-log-collectors-for-public-cloud%2Fmaster%2Fazure%2Fdeployments%2FeventHub%2Fazure-template-existing-eventhub.json) | [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fvmware%2Fvmware-log-collectors-for-public-cloud%2Fmaster%2Fazure%2Fdeployments%2FeventHub%2Fazure-template-new-eventhub.json) |
| In this deployment, as Event Hub is already available in azure environment, we need to configure the existing Event Hub in newly created function's eventhub trigger integration. | In this deployment, we will be deploying new Event Hub, and it will be pre configured in newly created function. |


## Contributing
The vmware-log-collectors-for-public-cloud project team welcomes contributions from the community. Before you start working with vmware-log-collectors-for-public-cloud, please read our [Developer Certificate of Origin](https://cla.vmware.com/dco). All contributions to this repository must be signed as described on that page. Your signature certifies that you wrote the patch or have the right to pass it on as an open-source patch. For more detailed information, refer to [CONTRIBUTING.md](../CONTRIBUTING.md).

## License
Please see [LICENSE.txt](../LICENSE.txt).


## For Developers
Developer need to run following command in `/azure` directory, once code changes done in `/src` directory,

`yarn build`

This command will copy required files in blobStorageFunction and eventHubFunction under `/target` directory, which will later be used by template for automated deployment.
