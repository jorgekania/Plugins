// TODO
// - Styling for selected
// - Styling for container / header
// - Styling for clear option
// - State saving integration
// - Fix regex characters - (CEO) for example

(function(factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['jquery', 'datatables.net'], function($) {
			return factory($, window, document);
		});
	} else if (typeof exports === 'object') {
		// CommonJS
		module.exports = function(root, $) {
			if (!root) {
				root = window;
			}

			if (!$ || !$.fn.dataTable) {
				$ = require('datatables.net')(root, $).$;
			}

			return factory($, root, root.document);
		};
	} else {
		// Browser
		factory(jQuery, window, document);
	}
})(function($, window, document, undefined) {
	'use strict';
	var DataTable = $.fn.dataTable;

	function SearchPanes(settings, opts) {
		var that = this;
		var table = new DataTable.Api(settings);

		this.classes = $.extend(true, {}, SearchPanes.classes);

		this.dom = {
			container: $('<div/>').addClass(this.classes.container)
		};

		this.c = $.extend( true, {}, SearchPanes.defaults, opts );

		this.s = {
			dt: table
		};

		table
			.columns(opts.columns)
			.eq(0)
			.each(function(idx) {
				that._pane(idx);
			});

		$(this.dom.container)
			.on('click', 'li', function() {
				that._toggle(this);
			})
			.on('click', 'button.' + this.classes.clear, function() {
				that._clear($(this).closest('div.' + that.classes.pane.container));
			});

		this._attach();
	}

	$.extend(SearchPanes.prototype, {
		_attach: function () {
			var container = this.c.container;
			var host = typeof container === 'function' ?
				container( this.s.dt ) :
				container;
			
				console.log( host );
			
			if ( this.c.insert === 'prepend' ) {
				$(this.dom.container).prependTo( host );
			}
			else {
				$(this.dom.container).appendTo( host );
			}
		},

		_binData: function(data) {
			var out = {};

			data.each(function(d) {
				if (!d) {
					return;
				}

				if (!out[d]) {
					out[d] = 1;
				} else {
					out[d]++;
				}
			});

			return out;
		},

		_clear: function(pane) {
			var classes = this.classes;
			var itemSelected = classes.item.selected;

			pane.find('li.' + itemSelected).removeClass(itemSelected);
			pane.removeClass(classes.pane.active);

			this.s.dt
				.column(pane.data('column'))
				.search('')
				.draw();
		},

		_pane: function(idx) {
			var classes = this.classes;
			var itemClasses = classes.item;
			var paneClasses = classes.pane;
			var table = this.s.dt;
			var column = table.column(idx);
			var list = $('<ul/>');
			var bins = this._binData(column.data().flatten());

			// Don't show the pane if there isn't enough variance in the data
			if ( this._variance(bins) < this.c.threshold ) {
				return;
			}

			// On initialisation, do we need to set a filtering value from a
			// saved state or init option?
			var search = column.search();
			search =
				search.length && search[0]
					? search[0].substr(1, search[0].length - 2).split('|')
					: [];

			var data = column
				.data()
				.unique()
				.sort()
				.toArray();

			for (var i = 0, ien = data.length; i < ien; i++) {
				if (data[i]) {
					var li = $('<li/>')
						.html(
							'<span class="' + itemClasses.label + '">' + data[i] + '</span>'
						)
						.data('filter', data[i])
						.append(
							$('<span/>')
								.addClass(itemClasses.count)
								.html(bins[data[i]])
						);

					if ($.inArray(data[i], search) !== -1) {
						li.addClass(itemClasses.selected);
					}

					list.append(li);
				}
			}

			$(this.dom.container).append(
				$('<div/>')
					.data('column', idx)
					.addClass(paneClasses.container)
					.addClass(search.length ? paneClasses.active : '')
					.append(
						$('<button type="button">&times;</button>').addClass(
							this.classes.clear
						)
					)
					.append(
						$('<div/>')
							.addClass(paneClasses.title)
							.html($(column.header()).text())
					)
					.append(
						$('<div/>')
							.addClass(paneClasses.scroller)
							.append(list)
					)
			);
		},

		_toggle: function(li) {
			var classes = this.classes;
			var itemSelected = classes.item.selected;
			var table = this.s.dt;
			var li = $(li);
			var pane = li.closest('div.' + classes.pane.container);

			li.toggleClass(itemSelected, !li.hasClass(itemSelected));

			var filters = pane.find('li.' + itemSelected);

			if (filters.length === 0) {
				pane.removeClass(classes.pane.active);
				table
					.column(pane.data('column'))
					.search('')
					.draw();
			} else {
				pane.addClass(classes.pane.active);
				table
					.column(pane.data('column'))
					.search(
						$.map(filters, function(filter) {
							return $(filter).data('filter');
						}).join('|'),
						true,
						false
					)
					.draw();
			}
		},
		
		_variance: function ( d ) {
			var data = $.map( d, function (val, key) {
				return val;
			} );

			var count = data.length;
			var sum = 0;
			for ( var i=0, ien=count ; i<ien ; i++ ) {
				sum += data[i];
			}
			
			var mean = sum / count;
			var varSum = 0;
			for ( var i=0, ien=count ; i<ien ; i++ ) {
				varSum += Math.pow( mean - data[i], 2 );
			}

			return varSum / (count-1);
		},
	});

	SearchPanes.classes = {
		container: 'dt-searchPanes',
		clear: 'clear',
		pane: {
			active: 'filtering',
			container: 'pane',
			title: 'title',
			scroller: 'scroller'
		},
		item: {
			selected: 'selected',
			label: 'label',
			count: 'count'
		}
	};

	SearchPanes.defaults = {
		container: function ( dt ) {
			return dt.table().container();
		},
		columns: null,
		insert: 'prepend',
		threshold: 0.5
	};

	$(document).on('init.dt', function(e, settings, json) {
		if (e.namespace !== 'dt') {
			return;
		}

		var init = settings.oInit.searchPane;
		var defaults = DataTable.defaults.searchPane;

		if (init || defaults) {
			var opts = $.extend({}, init, defaults);

			if (init !== false) {
				new SearchPanes(settings, opts);
			}
		}
	});
});