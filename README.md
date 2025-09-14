# infinite-paper

> Web Components for design sketches

[Usage](#usage) |
[API](#api) |
[License](#license)

## Usage

Add a single *infinite-paper*: it will fill the whole viewport.
Put also some *window-frame*, for example

```html
<infinite-paper>
  <window-frame
    top="10"
    left="10"
    width="200"
    height="400"
    src="https://www.example.com/page.html"
  ></window-frame>
</infinite-paper>
```

## API

### CSS variables

```css
--design-canvas-background: #f6f6f6;
--design-canvas-shadow: 1px 1px 7px 1px rgba(0, 0, 0, 0.17);
```

## License

[MIT](https://fibo.github.io/mit-license)
