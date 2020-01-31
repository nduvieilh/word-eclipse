import StorageService from './StorageService';
import Settings from './Settings.json';
import { createRegExMatch } from './MatchService';

document.addEventListener('storage-initialized', async function (e) {
  console.log(e.detail);
  await highlightWords();
});

let storage = new StorageService();

async function highlightWords() {
  let matches = await storage.getActiveMatches();
  let matchesStrings = new Map();
  matches.forEach((match) => {
    match.strings.forEach((string) => {
      matchesStrings.set(string, match);
    });
  });

  let list = scanDocument(matchesStrings);

  await eclipseAll(list);
}

function scanDocument(matchesStrings) {
  let list = new Map();

  textNodesUnder(document.querySelector('html'), (textNode) => {
    // Quickly drop out if:
    // innerText is empty
    if (!textNode.wholeText) return false;
    // If matches a blacklisted node name or can't find node name
    if (!textNode.parentElement.nodeName || Settings.blacklist.nodeNames.indexOf(textNode.parentElement.nodeName) > -1) return false;

    const iterator = matchesStrings[Symbol.iterator]();
    
    for(let matchesString of iterator) {
      let matchRE = new RegExp(matchesString[0], 'gi');
      if(matchRE.test(textNode.wholeText)) {
        addToMap(matchesString[1], matchesString[0], textNode);
      }
    }

  });

  function addToMap(match, matchString, element) {
    if (!list.has(match)) {
      list.set(match, new Set());
    }

    const set = list.get(match);
    const matchObj = {
      matchString: matchString,
      element: element
    }
    set.add(matchObj);
  }


  console.log('list', list.entries());

  return list;
}

function textNodesUnder(el, extraFilter) {
  var n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, extraFilter || null, false);
  while (n = walk.nextNode()) a.push(n);
  return a;
}

async function eclipseAll(list) {
  list.forEach((matchObjs, match) => {
    matchObjs.forEach(async (matchObj) => eclipse(matchObj, match));
  });
}

async function eclipse(matchObj, match) {
  const style = await storage.getStyleByName(match.style);
  const {
    element,
    matchString
  } = matchObj;

  const text = element.innerHTML || element.wholeText;
  const tempDom = document.createElement('div');
  const matchRE = new RegExp(matchString, 'gi');

  tempDom.innerHTML = text.replace(matchRE, `<span style="${style.css}">${matchString}</span>`)

  switch (element.nodeType) {
    case 1:
      element.innerHTML = tempDom.innerHTML;
      break;
    case 3:
      element.replaceWith(...tempDom.childNodes);
      break;
  }
}


undefined;