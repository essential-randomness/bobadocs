---
id: ui-tests
title: UI Tests with Jest and Storybook
---

This guide will cover how to write tests for the bobaboard-ui codebase. It assumes that you have some familiarity with Bobaboard as a user of the site, have taken at least a brief look at the file structure of the [bobaboard-ui codebase](https://github.com/essential-randomness/bobaboard-ui), and have a basic understanding of javascript, [Typescript](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html), and React components and props. If you would like to brush up on React, the React docs offer a number of great [resources for learning](https://reactjs.org/docs/getting-started.html#learn-react).

## Tools

We will use the following tools. We will explain more about each of them as we go, but here are links to all the docs in one place so they're easy to find:

- [Jest](https://jestjs.io/) - Sets up the basic structure of our tests and lets us `expect` a thing `.to` match some other thing or condition.
- [jest-dom](https://github.com/testing-library/jest-dom) - Extends Jest and gives us more useful `.to...` matchers.
- [Testing Library](https://testing-library.com/docs/dom-testing-library/intro) - Gives our tests ways to find elements in our rendered components that match as closely as possible to how the user would interact with the component on the the real site.
- [Storybook](https://storybook.js.org/docs/react/get-started/introduction) - Lets us render and test our ui components independently. For Bobaboard it looks like [this](https://bobaboard-ui.netlify.app/).
- **Storybook Add-ons:**
  - [@storybook/testing-react](https://storybook.js.org/addons/@storybook/testing-react) - Lets us use our stories in Jest tests.
  - [Actions](https://storybook.js.org/docs/react/essentials/actions) - Lets us rig buttons and the like (that would normally interact with things outside of the current component) to tell us a certain thing happens when triggered.

## Stories

[Storybook](https://storybook.js.org/docs/react/get-started/introduction) lets us render and test our UI components independently from the business logic that weaves them together into the full site. When you run Storybook from the command line (bash terminal) in your bobaboard-ui directory with `yarn run storybook`, it will open in your browser looking more or less like [this](https://bobaboard-ui.netlify.app/), but will update live with any changes you make to the src code.

:::caution Known Issue
There is currently an issue with the bobaboard-ui codebase and Storybook where after a few minutes Storybook starts running really slowly. Ms. Boba is trying to get it figured out. In the meantime, you may need to close it (ctrl+C in your terminal) and restart it when it becomes unusable.
:::

In order for Storybook to render our components, we need to compose stories files for them that let us directly pass the appropriate props to model the different permutations each component can take on.

The basic layout of a stories file for a component has:

- a `default` object with:
  - a `title` that tells Storybook how to group and label it in the Storybook sidebar.
  - a `component` that points it to the component to render.
- a `Template` which returns the component in jsx and sets up passing props to the components as `args`.
- One or more `Stories` that `bind` to the `Template` and have `args` objects that let us pass different sets of props to the component for each story.

In practice, a stories file looks something like this:

```typescript title="stories/11-ComponentGroup/01-Component.stories.tsx"
import Component, { ComponentProps } from "../../src/path/Component";
import { Meta, Story } from "@storybook/react";

import React from "react";
import { action } from "@storybook/addon-actions";

export default {
  title: "Component Group/Component Name",
  component: Component,
  // Optional 'decorators' can also be added here to wrap the component so it displays and behaves properly,
  // see the Storybook docs for details.
} as Meta;

const ComponentTemplate: Story<ComponentProps> = (args: ComponentProps) => {
  return <Component {...args} />;
};

export const StoryOne = ComponentTemplate.bind({});
StoryOne.args = {
  propA: "value",
  propB: true,
  propC: ["array", "of", "values"],
};

export const StoryTwo = ComponentTemplate.bind({});
StoryTwo.args = {
  propA: "different value",
  propB: false,
  propC: ["array", "with", "other", "values"],
};

export const StoryThree = ComponentTemplate.bind({});
StoryThree.args = {
  ...StoryOne.args,
  propA: "third value",
  propD: value,
};
```

The goal is to have enough stories to display each state a component could be in and each option it could have. If you are writing tests for an existing component, it should already have stories written, but you may find that you have to tweak them a bit, or add additional props, to cover all the cases you need to test.

:::tip Typescript Tip
If you ever want to see exactly what all the props a given component should or could have are, typescript has your back. Look in the src file for the component and find the `interface` and/or `type` declarations where the types are defined for the component's props. Here's an example from the BoardMenuItem component of Boba's Side Menu:

```typescript
export interface BoardMenuItemProps {
  avatar: string;
  color: string;
  updates?: number | boolean;
  slug: string;
  link: LinkWithAction;
  muted?: boolean;
  outdated?: boolean;
  current?: boolean;
  loading?: false;
}
```

:::

### Actions

If a component has props that are links or functions, we can use [actions](https://storybook.js.org/docs/react/essentials/actions) to model what happens when they are triggered.

For example, for a link, your `Story.args` might include:

```typescript
link: { href: "#slug", onClick: action("#slug") },
```

and a component with a Submit button on a text input might have:

```typescript
onSubmit: (text) => action("submit")(text),
```

When you type in this text input in Storybook and click the Submit button, the callback will be logged in Storybook's Action tab with _submit: "the text you typed"_. We can also leverage these actions in our tests to simulate what happens when a user interacts with the component.

## Jest Tests with React Testing Library

[Jest](https://jestjs.io/) tests let us compare our expected outcome for a piece of code to the actual result.

[Testing Library](https://testing-library.com/docs/dom-testing-library/intro) (and specifically its extension [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)) renders our components to the DOM and then lets us find specific DOM nodes with queries that mimic how real users would interact with them.

Together they let us compare UI elements as they are rendered to what we expect to be there and how we expect them to work.

### Setting Up the Test File

The first step in writing tests is to set up your test file. You can use the following as a template:

```typescript title="tests/11-ComponentGroup/Component.test.tsx"
import "@testing-library/jest-dom/extend-expect";

// Import the stories you're going to test against
import * as stories from "stories/11-ComponentGroup/01-Component.stories";

// Import the prop types for the component
import { ComponentProps } from "../../src/path/Component";

import { render, screen, waitFor, within } from "@testing-library/react";

import React from "react";
import { action } from "@storybook/addon-actions";
import { composeStories } from "@storybook/testing-react";
import { mocked } from "ts-jest/utils";
import userEvent from "@testing-library/user-event";

// Set up jest to mock actions
jest.mock("@storybook/addon-actions");

// Set up each story you want to run tests on
const { StoryOne, StoryTwo, StoryThree } = composeStories(stories);

// the describe() function lets us create groups of tests within our file.
// You generally want to group all the tests for a given story into a describe().
describe("StoryOne", () => {
  test("Description of a thing to test", async () => {
    render(<StoryOne />);
    //TODO fill in the test details
  });

  test("Description of another thing to test", async () => {
    render(<StoryOne />);
    //TODO fill in the test details
  });

  test("Description of a third thing to test", async () => {
    render(<StoryOne />);
    //TODO fill in the test details
  });
});

describe("StoryTwo", () => {
  test("Description of a thing to test", async () => {
    render(<StoryTwo />);
    //TODO fill in the test details
  });
});

describe("StoryThree", () => {
  test("Description of a thing to test", async () => {
    render(<StoryThree />);
    //TODO fill in the test details
  });
});
```

### Determining What to Test

We want to test that everything we expect to be rendered is, and that things we expect not to be rendered aren't, as well as that any interactables function as expected. Ideally, we want to catch as many edge cases as we can think of, as well as test the straightforward cases. Of course users will always find edge cases we didn't imagine, so our test suits will grow as time goes on and we are given new exciting things we need to test against.

There is a general rule that we want to test the functional results of our code, not the implementation details, so that when things get refactored, our tests don't break unless we've actually done something that would effect how the site works for users. That means, as much as possible, when deciding what to test, we want to think about how our components work from the users' perspective and test the things that they see on screen/hear with a screen reader, interact with, or expect to work a certain way, rather than the internal logic of our components. If someone would file a bug report about it if it broke, you should test it. But this is also not the way to test layout or styling things like colors or sizes, so don't get too bogged down in details, even if things like colour are being used to convey some amount of meaning. For instance, if we are testing the Side Menu, we want to test that boards with new updates are marked correctly, and within that test we want to test both that the board links are accessibly labeled in a way that flags the presence of new updates for screen readers, and that the notification dot is visible for sighted users, but not the color of the notification dot in comparison to the darker color used for outdated updates.

For a full example, here the descriptions of the tests for the BoardMenuSection component of the Side Menu:

```typescript title="tests/20-SideMenu/BoardMenuSection.test.tsx"
describe("Regular", () => {
  test("Renders section with board menu items", async () => {
    render(<Regular />);
    // Test details
  });

  test("Board menu items link to boards", async () => {
    render(<Regular />);
    // Test details
  });

  test("Correctly renders board without updates", async () => {
    render(<Regular />);
    // Test details
  });

  test("Correctly marks boards with updates", async () => {
    render(<Regular />);
    // Test details
  });

  test("Correctly marks outdated boards with updates", async () => {
    render(<Regular />);
    // Test details
  });

  test("Correctly marks current board", async () => {
    render(<Regular />);
    // Test details
  });

  test("Correctly marks muted board", async () => {
    render(<Regular />);
    // Test details
  });
});

describe("Empty", () => {
  test("Renders empty section", async () => {
    render(<Empty />);
    // Test details
  });
});

describe("Loading", () => {
  test("Renders loading section", async () => {
    render(<Loading />);
    // Test details
  });
});
```

Similar tests are run on the Pinned Menu, and then the following tests are run on the whole Side Menu:

```typescript title="tests/20-SideMenu/SideMenu.test.tsx"
test("Renders pinned menu", async () => {
  render(<SideMenuPreview />);
  // Test details
});

test("Pinned Menu doesn't render when turned off", async () => {
  render(<SideMenuPreview showPinned={false} />);
  // Test details
});

test("Renders boards menu", async () => {
  render(<SideMenuPreview />);
  // Test details
});

test("Renders boards dropdown menu on button click", async () => {
  render(<SideMenuPreview />);
  // Test details
});

test("Renders board filter", async () => {
  render(<SideMenuPreview />);
  // Test details
});

test("Correctly propagates filter change on text entry", async () => {
  render(<SideMenuPreview />);
  // Test details
});

test("Boards filter returns an empty string on text entry deletion", async () => {
  render(<SideMenuPreview />);
  // Test details
});
```

### Writing the Tests

The core of Jest is the `expect()` [API](https://jestjs.io/docs/expect) and it's matcher methods. This is the basic form of `expect()` assertions:

```typescript
expect(value).toBe(expectedValue);
```

For UI tests, instead of expecting a value, we expect a HTML element to have a certain characteristic. To help us expect more UI specific characteristics, we can use [jest-dom](https://github.com/testing-library/jest-dom)'s additional matchers to supplement the ones in the base Jest API, for things like:

```typescript
expect(HTMLElement).toBeVisible();
```

or

```typescript
expect(HTMLElement).toHaveTextContent("a string we think should be there");
```

To find our HTML elements, we prefer to use Testing Library's [queries](https://testing-library.com/docs/queries/about) because they allow us to find things the way a user would, though we can also use regular javascript DOM API methods like `querySelector()` and `getElementsByTagName()` in a pinch.

Most of the time we want to query the entire document, so we use our queries on `screen`:

```typescript
screen.getByLabelText("Label text");
```

for assertions that look like this:

```typescript
expect(screen.getByLabelText("Label text")).toHaveTextContent("text");
```

But sometimes we want to query only within a particular DOM node and for that we can use `within()`:

```typescript
const blueBox = screen.getByLabelText("A blue box");
expect(within(blueBox).getByRole("button")).toHaveTextContent("click me!");
```

What values we want to expect a given element to match depend on the content of the component we're testing, and the values of the props we have passed in the `args` of our stories. Sometimes it makes the most sense to hard code the expected value into the test, but where practical, it's better to reference `Story.args.value` if you can. For instance, if we have supplied our story with an array of eight items with links and we want to test that our component is in fact making eight links out of it, we would do this:

```typescript
expect(screen.getAllByRole("link")).toHaveLength(Story.args.items.length);
```

not this:

```typescript
expect(screen.getAllByRole("link")).toHaveLength(8);
```

That way if someone goes and adds an extra item into the story array at some point, they don't have to also update the length value in the test.

:::tip Typescript Tip
When you are trying to access the value of a story prop with `Story.args.value` you may run in two sorts of related typescript errors:

1. The prop is of a type that is actually `TypeA | TypeB`. We can tell it which type it is explicitly by saying `(Story.args as TypeA).value`.
2. The prop is potentially undefined. We can assert that the value is not null or undefined with `!` like this `Story.args!.value!`. (If you are using eslint you will still have a "Forbidden non-null assertion" error, but you can ignore it here.)

Outside of testing, we generally want to avoid these sort of assertions, and actually handle the null cases in our code and use [narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) to determine which of multiple possible types we are working with, but for testing that's overkill. If something goes wrong, the repercussions are that the test fails, which is what we want to happen in the case of a problem anyway.
:::

For an example of all of this put together into a complete test, let's look at the actual test for the scenario we mentioned in the Determine What to Test section - making sure that boards with new updates are correctly marked in the BoardMenuSection component of the Side Menu:

```typescript title="tests/20-SideMenu/BoardMenuSection.test.tsx"
test("Correctly marks boards with updates", async () => {
  render(<Regular />);

  // Find an element with the correct label text.
  // If this can't find an exact match it will throw an error and the test will fail here.
  const goreBoard = screen.getByLabelText("gore has new updates");

  // Make sure the label is on the menu item with the correct visible text.
  expect(goreBoard).toHaveTextContent("!gore");

  // Make sure that the notification dot is visible within that specific menu item.
  // We need to pass the hidden:true option to the getByRole query in order for it to find elements that
  // are normally excluded from the accessibility tree.
  expect(
    within(goreBoard).getByRole("presentation", { hidden: true })
  ).toBeVisible();
  expect(
    within(goreBoard).getByRole("presentation", { hidden: true })
  ).toHaveClass("board-icon__update");

  // There are two SVG icons that could potentially be within a menu item: Muted, and the Current Board marker.
  // The Current Board marker is always there, but should be hidden by CSS if this is not current board.
  // The Muted icon should only be rendered at all if this board is muted.
  // So we can make sure this board is neither muted nor the current page by checking that there is only one SVG
  // and it is not visible.
  const svgs = goreBoard.getElementsByTagName("svg");
  expect(svgs).toHaveLength(1);
  expect(svgs[0]).toHaveClass("fa-map-marker-alt");
  expect(svgs[0]).not.toBeVisible();
});
```

:::tip Accessibility - Aria Labels, Rolls, and Attributes
You may have noticed that Testing Library queries rely heavily on accessible labels, roles, and attributes. This is good because it reminds us to use them properly in our components.

If you are writing tests for existing Bobaboard components, you will likely have to go into to the component scr file and add labels and other accessibility features yourself. Please do! Accessibility can seem intimidating, but just do your best and ask questions when you need to.

W3C's WAI-ARIA definitions can be found here:

- [Roles](https://www.w3.org/TR/wai-aria-1.1/#role_definitions)
- [Attributes](https://www.w3.org/TR/wai-aria-1.1/#state_prop_def)

[WAI-ARIA Authoring Practices 1.2](https://www.w3.org/TR/wai-aria-practices-1.2) is also a good resource. You don't need to read it all the way through for writing tests, but the [Providing Accessible Names and Descriptions](https://www.w3.org/TR/wai-aria-practices-1.2/#names_and_descriptions) section can be really helpful for better understanding how best to use aria labels.
:::

:::caution Aria in React
Aria labels, rolls, and attributes need to go on the actual basic html elements in jsx, but Typescript/VScode won't catch it as a problem if you accidentally try to put them on a component.

```typescript title="Within BoardMenuSection.tsx"
// These won't work, but also wont give helpful red squiggly underlines :(
<BoardMenuItem aria-label=`${slug} board` aria-current={current ? "page" : false} />
```

Instead you need to pass your label text down as a prop to the child component and add the label there, or even farther down.

```typescript title="Within BoardMenuSection.tsx"
<BoardMenuItem label=`${slug} board` current={current} />
```

```typescript title="Within BoardMenuItem.tsx"
<ActionLink label={label} current={current ? "page" : false} />
```

```typescript title="Within ActionLink.tsx"
<a aria-label={label} aria-current={current} />
```

As time goes on, more and more of the common base components should have label and other accessibility props already defined and implemented in them, and you will just have to pass your prop to them, but if one you need isn't there, please go ahead and add it.
:::

:::note Tests without stories
We use [@storybook/testing-react](https://storybook.js.org/addons/@storybook/testing-react) to let our tests render our pre-existing stories so we don't have to repeat work and can simply use `render(<Story />);` in our tests, but you can also directly render the component inside a test. You can do so by passing the whole jsx for the component to `render()`, including whatever props you need, as you would normally compose a React component.

This is mostly useful for testing failure states or edge cases where it doesn't make sense to have a whole story for the scenario. Here's an example where we are testing that if the Pinned Menu is passed a section with no items in it, it doesn't create any items:

```typescript
test("Doesn't render items in empty section", async () => {
  render(
    <PinnedMenu>
      <PinnedMenu.Section
        icon={faThumbtack}
        sectionId="pinned boards"
        items={[]}
      />
    </PinnedMenu>
  );

  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("pinned item is loading")
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("pinned boards")).toBeVisible();
});
```

:::

:::caution
If you want to query that an element is not in the document, you need to use `.queryBy...` instead of `.getBy...`.

`.getBy...` throws an error if it can't find the thing it's looking for and your test will fail immediately, where as `.queryBy...` returns null (or an empty array in the case of `.queryAllBy...`) which can then successfully be compared to the matcher `.not.toBeInTheDocument`.
:::

### Mock Functions and userEvent

Some tests require us to simulate what happens when a user interacts with a part of the UI. To do this we use Jest's [mock functions](https://jestjs.io/docs/mock-functions) and the [user-event](https://testing-library.com/docs/ecosystem-user-event) library from Testing Library in conjunction with the [actions](#actions) from our stories.

:::caution
Bobaboard-ui is currently using the older 13.5.0 version of user-event, the docs for which can be found [here](https://testing-library.com/docs/ecosystem-user-event), not the 14.0.0-beta version described in the rest of the User Interactions section of the Testing Library docs.
:::

Jest mock functions can do a number of things, but for UI tests we most often use them to mock an action from a story, which we set up like this:

```typescript
const actionReturn = jest.fn();
mocked(action).mockReturnValue(actionReturn);
```

Then we can use a userEvent on the element in question to simulate how the user would interact with it. We mostly use `userEvent.click()` or `userEvent.type()` but there are a number of other helper methods available as well.

:::info
Testing Library also has a fireEvent method, but most of the time it's better to use userEvent which more accurately simulates how a user would interact with the component.
:::

If a function is being called or a change is happening in the DOM as a result of our userEvent, we then want to use `await` and wrap our `expect()`s for the results in a `waitFor(() => {})`.

As examples, here are two tests for the Side Menu, the first which calls a mock function that doesn't return a function and the second of which calls a mock function that does:

```typescript title="tests/20-SideMenu/SideMenu.test.tsx"
test("Renders boards dropdown", async () => {
  render(<SideMenuPreview />);

  const actionReturn = jest.fn();
  mocked(action).mockReturnValue(actionReturn);

  userEvent.click(screen.getByLabelText("board menu options"));
  await waitFor(() => {
    expect(screen.getByText("Dismiss notifications")).toBeVisible();
  });
  userEvent.click(screen.getByText("Dismiss notifications"));
  await waitFor(() => {
    expect(action).toBeCalledWith("dismissNotifications");
  });

  await waitFor(() => {
    expect(screen.queryByText("Dismiss notifications")).not.toBeInTheDocument();
  });
});

test("Correctly propagates filter change on text entry", async () => {
  render(<SideMenuPreview />);

  const actionReturn = jest.fn();
  mocked(action).mockReturnValue(actionReturn);

  const boardFilter = screen.getByRole("searchbox");
  userEvent.type(boardFilter, "meta");
  await waitFor(() => {
    expect(action).toBeCalledWith("filterBoards");
    expect(actionReturn).toBeCalledWith("meta");
  });
  expect(boardFilter).toHaveValue("meta");

  userEvent.type(boardFilter, "{backspace}{backspace}");
  await waitFor(() => {
    expect(action).toBeCalledWith("filterBoards");
    expect(actionReturn).toBeCalledWith("me");
  });
  expect(boardFilter).toHaveValue("me");
});
```

And here is the story args where the actions are constructed:

```typescript title="stories/20-SideMenu/20-SideMenu.stories.tsx"
export const SideMenuPreview = SideMenuPreviewTemplate.bind({});
SideMenuPreview.args = {
  showPinned: true,
  loading: true,
  currentBoardSlug: "kink-memes",
  onFilterChange: (text) => action("filterBoards")(text),
  menuOptions: [
    {
      name: "Dismiss notifications",
      link: { onClick: () => action("dismissNotifications")() },
    },
  ],
};
```

### Running Tests

Running `yarn run test` from the command line (bash terminal) in your bobaboard-ui directory will run all the existing tests, and you can also run individual test suites with `yarn jest fileName`. You should run your tests fairly often as you're working on them to make sure they are doing what you intended.

If you are working on other code and want to make sure you're not breaking anything, you can use `yarn run test:watch` to automatically run the existing tests on your changes whenever you save.
