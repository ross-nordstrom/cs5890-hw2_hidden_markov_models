
all:
	mkdir -p build
	pdflatex report.tex
	mv *.aux build/.
	mv *.log build/.
	#mv *.bbl build/.
	#mv *.blg build/.
	#mv *.out build/.
	mv report.pdf Nordstrom_HW2.pdf

clean:
	rm -fv *.aux *.pdf *.log *.bbl *.blg *.out
