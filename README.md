# infinite-paper

> Web Components for design sketches

[Usage](#usage) |
[API](#api) |
[License](#license) |

## Usage

Add a single *infinite-paper*: it will disable scroll and fill the whole viewport.
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

### `<infinite-paper>`

HTML attributes:

- `scale: number`

CSS variables:

- `--infinite-paper-background-color: #fefefe`

### `<window-frame>`

HTML attributes:

- `top: number`
- `left: number`
- `width: number`
- `height: number`
- `src: string`

CSS variables:

- `--window-frame-box-shadow-color: rgba(0, 0, 0, 0.17)`

## License

[MIT](https://fibo.github.io/mit-license)
