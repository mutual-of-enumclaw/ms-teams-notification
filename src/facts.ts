import * as core from '@actions/core'
import yaml from 'yaml'
import { getWorkflowRunStatus } from './getWorkflowRunStatus'
export async function getFacts() {
  const customFacts = core.getInput('custom-facts', {required: false})
  const facts: Fact[] = []
  if (customFacts && customFacts.toLowerCase() !== 'null') {
    try {
      let customFactsCounter = 0
      const customFactsList = yaml.parse(customFacts)
      if (Array.isArray(customFactsList)) {
        ;(customFactsList as any[]).forEach(fact => {
          if (fact.name !== undefined && fact.value !== undefined) {
            facts.push(new Fact(fact.name + ':', fact.value))
            customFactsCounter++
          }
        })
      }
    } catch {
      console.warn('Invalid custom-facts value.')
    }
    facts.push(new Fact('Status:', (await getWorkflowRunStatus()).conclusion))
  }
  return facts
}

export class Fact {
  name: string
  value: string

  constructor(name: string, value: string) {
    this.name = name
    this.value = value
  }
}
