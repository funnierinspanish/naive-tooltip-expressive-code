// @ts-check
import { definePlugin, ExpressiveCodeAnnotation } from '@expressive-code/core'
import { addClassName, h} from '@expressive-code/core/hast'

enum ToolTipExampleMediaType {
  Image = "image",
  Video = "video",
  Gif = "gif",
}

enum ReferenceType {
  Guide = "guide",
  DocsReference = "docsReference",
  Tutorial = "tutorial",
  Video = "video",
  BlogPost = "blogPost",
  External = "external",
  Example = "example",
}

type Reference = {
  name?: string;
  description?: string;
  type: ReferenceType;
  url: string;
}

type ToolTipExampleMedia = {
  type: ToolTipExampleMediaType;
  src: string;
}


type ToolTipContentsExample = {
  code?: string;
  description?: string;
  title?: string;
  media?: ToolTipExampleMedia[]
}

type ToolTipContents = {
  title: string;
  type: string;
  description: string;
  examples?: ToolTipContentsExample[];
  references?: Reference[]
}

const tokensList: Record<string, ToolTipContents> = {
    "Point": {
      title: "Point",
      type: "class",
      description: "A point in a 2D space",
    },
    "Vector": {
      title: "Vector",
      type: "class",
      description: "A vector in a 2D space",
    },
    "add": {
      title: "add",
      type: "method",
      description: "Adds two numbers together",
    },
    "subtract": {
      title: "subtract",
      type: "method",
      description: "Subtracts two numbers",
    },
};

const stringsToMatch = Object.keys(tokensList);

const keyWordRegExp = (): RegExp => {
  const escapedStrings = stringsToMatch.map(str => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

  const regexString = escapedStrings.join('|');

  return new RegExp(regexString, "g");
}


function createtooltipNode(token: string) {
  const contentObj = tokensList[token];
  const tooltipHeader = h('p',  contentObj.title)
  addClassName(tooltipHeader, "tooltip-header")

  const tooltipContent = h('div',   [
    tooltipHeader,
    h('p', contentObj.type),
    h('p', contentObj.description)
  ])
  addClassName(tooltipContent, "tooltip-content")
  return h('div', {"role": "tooltip", "tooltip-value": token},[
    tooltipContent
  ])
}

function getContentsForToken(token: string|undefined) {
  if(!token) return;
  if(!Object.hasOwn(tokensList,token)) return;
  
  const containerNode = createtooltipNode(token);
  addClassName(containerNode, 'tooltip-container');
  return containerNode;
}

const annotationsMap = new Map();

class SquigglesAnnotation extends ExpressiveCodeAnnotation {
  name: string|undefined;
  constructor(context: any, name: string|undefined) {
    // @ts-ignore
    super(context)
    this.name = name
  }
  
  // @ts-ignore
  render({nodesToTransform}) {
    return nodesToTransform.map((node: any) => {
      node.children.push(getContentsForToken(this.name))
      return h('span.special-token', node)
    })
  }
}

export function pluginNaiveCodeTooltip() {
  return definePlugin({
    name: 'tooltips',
    baseStyles: `
      .expressive-code pre {
        overflow: visible;
      }

      .special-token {
        background-color: unset;
        position: relative;
        display: inline-block;
        transition: background-color 0.3s ease-in-out;
      }
      .special-token:hover {
        background-color: hsl(302.43deg 31.19% 53.3% / 34%);
        border-radius: 3px;

        & .tooltip-container {
          background-color: #222!important;
          color: #aaa!important;
          display: block;
          visibility: visible;
          opacity: 1;
        }
      }

      .tooltip-container {
        display: none;
        visibility: hidden;
        position: absolute;
        z-index: 1;
        white-space: nowrap;
        padding: 0.75rem 1rem;
        box-shadow: 0 0 0.2rem #000;
        font-style: italic;
        border-radius: 0.2rem;
        opacity: 0;
        transition: opacity 0.3s ease-in-out 2s;

        & .tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;

          & p {
            margin: 0;
          }

          & .tooltip-header {
            font-size: 1rem;
            font-weight: bold;
          }
        }
      }
    `,
    hooks: {
      preprocessCode: (context) => {
        if (!context.codeBlock.meta.includes('naive-code-tooltip')) return
        context.codeBlock.getLines().forEach((line) => {
          const matches = [...line.text.matchAll(keyWordRegExp())].reverse()
          matches.forEach((match) => {
            const stringMatch = match[0].trim()
            const from = match.index || 0
            const to = from + stringMatch.length
            const annotation = line.addAnnotation(
              new SquigglesAnnotation({
                inlineRange: {
                  columnStart: from,
                  columnEnd: to,
                },
              }, stringMatch)
            )
            
            if (!annotationsMap.has(stringMatch)) {
              annotationsMap.set(stringMatch, getContentsForToken(stringMatch))
            }
            

            // Remove the squiggle markup from the code plaintext
            line.editText(from, to, stringMatch)
          })
        })
      },
    }
  })
}