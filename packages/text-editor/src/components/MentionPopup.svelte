<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Label, ListView, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation, { getClient, ObjectSearchCategory } from '@hcengineering/presentation'

  import { Class, Ref, Doc, SearchResultDoc } from '@hcengineering/core'
  import MentionResult from './MentionResult.svelte'

  export let query: string = ''

  interface SearchSection {
    category: ObjectSearchCategory
    items: SearchResultDoc[]
  }
  interface SearchItem {
    num: number
    item: SearchResultDoc
    category: ObjectSearchCategory
  }

  let items: SearchItem[] = []
  let categories: ObjectSearchCategory[] = []

  const client = getClient()

  client
    .findAll(presentation.class.ObjectSearchCategory, { context: 'mention' })
    .then(async (results) => {
      categories = results
      await updateItems(query)
    })
    .catch((e) => {
      console.error(e)
    })

  const dispatch = createEventDispatcher()

  let list: ListView
  let scrollContainer: HTMLElement
  let selection = 0

  function dispatchItem (item: SearchResultDoc): void {
    dispatch('close', {
      id: item.id,
      label: item.shortTitle ?? item.title,
      objectclass: item.doc._class
    })
  }

  export function onKeyDown (key: KeyboardEvent): boolean {
    if (key.key === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list?.select(selection + 1)
      return true
    }
    if (key.key === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      if (selection === 0 && scrollContainer !== undefined) {
        scrollContainer.scrollTop = 0
      }
      list?.select(selection - 1)
      return true
    }
    if (key.key === 'Enter' || key.key === 'Tab') {
      key.preventDefault()
      key.stopPropagation()
      if (selection < items.length) {
        const searchItem = items[selection]
        dispatchItem(searchItem.item)
        return true
      } else {
        return false
      }
    }
    return false
  }

  function packSearchResultsForListView (sections: SearchSection[]): SearchItem[] {
    let results: SearchItem[] = []
    for (const section of sections) {
      const category = section.category
      const items = section.items

      if (category.classToSearch !== undefined) {
        results = results.concat(
          items.map((item, num) => {
            return { num, category, item }
          })
        )
      }
    }
    return results
  }

  function findCategoryByClass (
    categories: ObjectSearchCategory[],
    _class: Ref<Class<Doc>>
  ): ObjectSearchCategory | undefined {
    for (const category of categories) {
      if (category.classToSearch === _class) {
        return category
      }
    }
    return undefined
  }

  async function doFulltextSearch (classes: Array<Ref<Class<Doc>>>, query: string): Promise<SearchSection[]> {
    const result = await client.searchFulltext(
      {
        query: `${query}*`,
        classes
      },
      {
        limit: 10
      }
    )

    const itemsByClass = new Map<Ref<Class<Doc>>, SearchResultDoc[]>()
    for (const item of result.docs) {
      const list = itemsByClass.get(item.doc._class)
      if (list === undefined) {
        itemsByClass.set(item.doc._class, [item])
      } else {
        list.push(item)
      }
    }

    const sections: SearchSection[] = []
    for (const [_class, items] of itemsByClass.entries()) {
      const category = findCategoryByClass(categories, _class)
      if (category !== undefined) {
        sections.push({ category, items })
      }
    }

    return sections
  }

  async function updateItems (query: string): Promise<void> {
    const classesToSearch: Array<Ref<Class<Doc>>> = []
    for (const cat of categories) {
      if (cat.classToSearch !== undefined) {
        classesToSearch.push(cat.classToSearch)
      }
    }

    const sections = await doFulltextSearch(classesToSearch, query)
    items = packSearchResultsForListView(sections)
  }
  $: void updateItems(query)
</script>

{#if (items.length === 0 && query !== '') || items.length > 0}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <form class="antiPopup mentionPoup" on:keydown={onKeyDown} use:resizeObserver={() => dispatch('changeSize')}>
    <div class="ap-scroll" bind:this={scrollContainer}>
      <div class="ap-box">
        {#if items.length === 0 && query !== ''}
          <div class="noResults"><Label label={presentation.string.NoResults} /></div>
        {/if}
        {#if items.length > 0}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <ListView bind:this={list} bind:selection count={items.length}>
            <svelte:fragment slot="category" let:item={num}>
              {@const item = items[num]}
              {#if item.num === 0}
                <div class="mentonCategory">
                  <Label label={item.category.title} />
                </div>
              {/if}
            </svelte:fragment>
            <svelte:fragment slot="item" let:item={num}>
              {@const item = items[num]}
              {@const doc = item.item}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="ap-menuItem withComp"
                on:click={() => {
                  dispatchItem(doc)
                }}
              >
                <MentionResult value={doc} />
              </div>
            </svelte:fragment>
          </ListView>
        {/if}
      </div>
    </div>
    <div class="ap-space x2" />
  </form>
{/if}

<style lang="scss">
  .noResults {
    display: flex;
    padding: 0.25rem 1rem;
    align-items: center;
    align-self: stretch;
  }

  .mentionPoup {
    padding-top: 0.5rem;
  }

  .mentonCategory {
    padding: 0.5rem 1rem;
    font-size: 0.625rem;
    letter-spacing: 0.0625rem;
    color: var(--theme-dark-color);
    text-transform: uppercase;
    line-height: 1rem;
  }
</style>
