const puppeteer = require('puppeteer');
var fs = require('fs');
var argparse = require('argparse');


async function run(args) {
  outputdir='output'


  if (!fs.existsSync(outputdir)){
      fs.mkdirSync(outputdir);
  }

  screenshot=outputdir+'/screenshot.png'
  arglist=[
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--timeout 15000',
  ]
  if(args.proxy){
    arglist.push( '--proxy-server='+args.proxy);
  }

  const browser = await puppeteer.launch({
    timeout: 20000,
    args: arglist,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
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
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
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
  url = args.url[0];
  if (url.indexOf('://') < 0){
    url="http://"+url;
  }


  // Start navigation
  console.log("Navigating to: "+url);
  try {
    await page.goto(url);

  } catch (error) {
    console.error(error);
  }


  //Take screenshot
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log("Saved screenshot to: "+screenshot);


  // write content
  dom_content= await page.content();
  dom_file=outputdir+'/dom'
  await fs.writeFile(dom_file,dom_content, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("DOM saved to "+content_file);
  });

  //write intercepted requests
  requests_file=outputdir+'/requests'
  requests_content=interceptedRequests.join("\n");
  await fs.writeFile(requests_file,requests_content, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("intercepted requests saved to "+requests_file);
  });



//  console.log(html);
  //clean up

  browser.close();
  console.log("Browser closed");

}


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

run(args);
