const puppeteer = require('puppeteer');
var fs = require('fs');
var argparse = require('argparse');

async function fetch(args) {

  var result={}
  result['requests']=[]
  result['configuration']={}
  result['consolelog']=[]

  arglist=[
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--timeout 15000',
  ]

  result.configuration['proxy']=args.proxy
  if(args.proxy){
    arglist.push( '--proxy-server='+args.proxy);
  }

  const browser = await puppeteer.launch({
    timeout: 20000,
    args: arglist,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();

  result.configuration['useragent']=args.useragent
  if(args.useragent){
    console.log("Setting user agent to: "+args.useragent)
    page.setUserAgent(args.useragent);
  }


  // Request interception
  var interceptedRequests=[];
  await page.setRequestInterception(true);
   page.on('request', interceptedRequest => {
     //console.log("Page performed request to: "+interceptedRequest.url());
     interceptedRequests.push(interceptedRequest.url());
     interceptedRequest.continue();
   });
   page.on('response', resp=>{
  //  console.log("Received data for "+resp.url());

   });

  // Redirect interception
  browser.on('targetchanged', async target => {
  console.log("Redirected to "+target.url());
/*
    thepage=target.page();
    await thepage;
    console.log(thepage);
    */
  });

  //
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text())
    result['consolelog'].push(msg.text())
  }
  );
await page.exposeFunction('nodeLog', (message) => console.log(message));

  await page.evaluateOnNewDocument(() => {

    const observer = new MutationObserver(
      function() {
        // communicate with node through console.log method
        console.log('__mutation')
       }
      )
      const config = {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
      }
      observer.observe(target, config)

});

  // FIX URL
  url = args.url;
  if (url.indexOf('://') < 0){
    url="http://"+url;
  }


  // Start navigation
  console.log("Navigating to: "+url);
  try {
    await page.goto(url);
    result['configuration']['url']=url

  } catch (error) {
    console.error(error);
  }

  //Take screenshot
  screenshotdata=await page.screenshot({ fullPage: true });
  //console.log("Saved screenshot to: "+screenshot);
  result['fullpagescreenshot']=Buffer.from(screenshotdata).toString('base64')

  // write content
  dom_content= await page.content();
  result['pagedom']=Buffer.from(dom_content).toString('base64')

  //write intercepted requests
  result['requests']=interceptedRequests


//  console.log(html);
  //clean up

  browser.close();
  console.log("Browser closed");
  return result
}

if (require.main === module) {
  var ArgumentParser = argparse.ArgumentParser;
  var parser = new ArgumentParser({
    version: '0.0.1',
    addHelp:true,
    description: 'Argparse example'
  });
  parser.addArgument(
    [ '-p', '--proxy' ],
    {
      help: 'the proxy to use'
    }
  );
  parser.addArgument(
    [ '-u', '--user-agent' ],
    {
      help: 'the user agent to use',
      dest: 'useragent',
    }
  );
  parser.addArgument('url', {nargs: argparse.Const.REMAINDER})
  var args = parser.parseArgs();
  args.url = args.url[0]

  run(args);
}

// export the fetch function to other modules
module.exports = {
  fetch: fetch,
};
