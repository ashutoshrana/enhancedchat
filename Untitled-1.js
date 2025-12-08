<script type='text/javascript'>
	function initEmbeddedMessaging() {
		try {
			embeddedservice_bootstrap.settings.language = 'en_US'; // For example, enter 'en' or 'en-US'

			embeddedservice_bootstrap.init(
				'00DEc00000GfZ2M',
				'Embedded_Deployment_admission_for_Github',
				'https://strategiced--qasf.sandbox.my.site.com/ESWEmbeddedDeploymentad1761917017154',
				{
					scrt2URL: 'https://strategiced--qasf.sandbox.my.salesforce-scrt.com'
				}
			);
		} catch (err) {
			console.error('Error loading Embedded Messaging: ', err);
		}
	};
</script>
<script type='text/javascript' src='https://strategiced--qasf.sandbox.my.site.com/ESWEmbeddedDeploymentad1761917017154/assets/js/bootstrap.min.js' onload='initEmbeddedMessaging()'></script>
