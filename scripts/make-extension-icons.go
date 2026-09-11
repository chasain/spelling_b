package main

import (
	"image"
	"image/color"
	"image/png"
	"log"
	"os"
	"path/filepath"
	"strconv"
)

var (
	yellow = color.RGBA{255, 202, 40, 255}
	gold   = color.RGBA{244, 166, 25, 255}
	ink    = color.RGBA{49, 38, 62, 255}
	white  = color.RGBA{255, 255, 255, 255}
	sky    = color.RGBA{124, 214, 255, 255}
)

func ellipse(img *image.RGBA, cx, cy, rx, ry int, c color.RGBA) {
	for y := cy - ry; y <= cy+ry; y++ {
		for x := cx - rx; x <= cx+rx; x++ {
			dx, dy := x-cx, y-cy
			if x >= 0 && y >= 0 && x < img.Bounds().Dx() && y < img.Bounds().Dy() &&
				dx*dx*ry*ry+dy*dy*rx*rx <= rx*rx*ry*ry {
				img.SetRGBA(x, y, c)
			}
		}
	}
}

func line(img *image.RGBA, x0, y0, x1, y1, width int, c color.RGBA) {
	steps := max(abs(x1-x0), abs(y1-y0))
	if steps == 0 {
		ellipse(img, x0, y0, width, width, c)
		return
	}
	for i := 0; i <= steps; i++ {
		x := x0 + (x1-x0)*i/steps
		y := y0 + (y1-y0)*i/steps
		ellipse(img, x, y, width, width, c)
	}
}

func icon(size int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	ellipse(img, size/2, size/2, size/2-1, size/2-1, sky)
	ellipse(img, size*37/100, size*43/100, size*22/100, size*27/100, white)
	ellipse(img, size*63/100, size*43/100, size*22/100, size*27/100, white)
	line(img, size*42/100, size*29/100, size*32/100, size*16/100, max(1, size/50), ink)
	line(img, size*58/100, size*29/100, size*68/100, size*16/100, max(1, size/50), ink)
	ellipse(img, size*31/100, size*15/100, max(1, size/24), max(1, size/24), ink)
	ellipse(img, size*69/100, size*15/100, max(1, size/24), max(1, size/24), ink)
	ellipse(img, size/2, size*57/100, size*29/100, size*34/100, gold)
	ellipse(img, size/2, size*53/100, size*27/100, size*32/100, yellow)
	for _, y := range []int{49, 66} {
		for x := size*25/100; x <= size*75/100; x++ {
			yy := size * y / 100
			for w := -max(1, size/32); w <= max(1, size/32); w++ {
				if image.Pt(x, yy+w).In(img.Bounds()) {
					img.SetRGBA(x, yy+w, ink)
				}
			}
		}
	}
	ellipse(img, size*40/100, size*39/100, max(1, size/28), max(1, size/28), ink)
	ellipse(img, size*60/100, size*39/100, max(1, size/28), max(1, size/28), ink)
	return img
}

func abs(value int) int {
	if value < 0 {
		return -value
	}
	return value
}

func main() {
	if len(os.Args) != 2 {
		log.Fatal("usage: make-extension-icons OUTPUT_DIR")
	}
	if err := os.MkdirAll(os.Args[1], 0o755); err != nil {
		log.Fatal(err)
	}
	for _, size := range []int{16, 32, 48, 128} {
		path := filepath.Join(os.Args[1], "icon"+strconv.Itoa(size)+".png")
		file, err := os.Create(path)
		if err != nil {
			log.Fatal(err)
		}
		if err := png.Encode(file, icon(size)); err != nil {
			file.Close()
			log.Fatal(err)
		}
		if err := file.Close(); err != nil {
			log.Fatal(err)
		}
	}
}
