/*
 * Greenbone Security Assistant
 * $Id$
 * Description: JavaScript for bubble charts in GSA.
 *
 * Authors:
 * Timo Pollmeier <timo.pollmeier@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2014 Greenbone Networks GmbH
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/* Main chart generator */
function BubbleChartGenerator ()
{
  function my () {};

  var svg;
  var height;
  var width;
  var margin = {top: 5, right: 5, bottom: 5, left: 5};

  var data_transform = simple_bubble_data;
  var color_scale = severity_colors_gradient ();
  var title = title_static ("Loading bubble chart ...", "Bubble Chart");

  var records;
  var column_info;
  var data;

  var x_label = "";
  var y_label = "";
  var color_label = "";

  var x_field = "value";
  var y_field = "count";
  var color_field = "mean";

  var csv_data;
  var csv_blob;
  var csv_url;

  var html_table_data;
  var html_table_blob;
  var html_table_url;

  var svg_data;
  var svg_blob;
  var svg_url;

  var tooltip_func = function (d)
    {
      var label_value = format_data (d ["label_value"],
                                     data.column_info.columns ["label_value"]);
      var size_value  = format_data (d ["size_value"],
                                     data.column_info.columns ["size_value"]);
      var color_value = format_data (d ["color_value"],
                                     data.column_info.columns ["color_value"]);

      return label_value + ": " + size_value
              + " (" + color_label + ": " + color_value + ")";
    }

  my.height = function ()
    {
      return height;
    }

  my.width = function ()
    {
      return width;
    }

  my.x_field = function (value)
    {
      if (!arguments.length)
        return x_field;
      x_field = value;
      return my;
    }

  my.y_field = function (value)
    {
      if (!arguments.length)
        return y_field;
      y_field = value;
      return my;
    }

  my.y_field = function (value)
    {
      if (!arguments.length)
        return y_field;
      y_field = value;
      return my;
    }

  my.x_label = function (value)
    {
      if (!arguments.length)
        return x_label;
      x_label = value;
      return my;
    }

  my.y_label = function (value)
    {
      if (!arguments.length)
        return y_label;
      y_label = value;
      return my;
    }

  my.color_scale = function (value)
    {
      if (!arguments.length)
        return color_scale;
      color_scale = value;
      return my;
    }

  my.data_transform = function (value)
    {
      if (!arguments.length)
        return data_transform;
      data_transform = value;
      return my;
    }

  my.title = function (value)
    {
      if (!arguments.length)
        return title;
      title = value;
      return my;
    }

  my.show_loading = function (display)
    {
      display.header ().text (title ());
    }

  my.generate = function (original_data, chart, gen_params)
    {
      var display = chart.display ();
      var data_src = chart.data_src ();
      var update = (display.last_generator () == my);

      // Extract records and column info
      switch (data_src.command ())
        {
          case "get_aggregate":
            data = data_transform (original_data, gen_params);
            records = data.records;
            column_info = data.column_info;
            color_label = column_label (column_info.columns ["color_value"], false, false, true);
            break;
          default:
            console.error ("Unsupported command:" + data_src.command ());
            return;
        }
      display.header ().text (title (data));

      // Setup display parameters
      height = display.svg ().attr ("height") - margin.top - margin.bottom;
      width = display.svg ().attr ("width") - margin.left - margin.right;

      if (!update)
        {
          display.svg ().text ("");
          svg = display.svg ().append ("g");

          display.svg ().on ("mousemove", null)
          display.svg ().on ("mouseleave", null)

          svg.attr ("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

        }

      // Create bubbles
      var bubbles = d3.layout.pack()
          .sort (null)
          .size ([width, height])
          .value (function(d) { return d.size_value; })
          .padding(1.5);

      var nodes = bubbles.nodes({children: records})
                        .filter (function(d) { return d.depth != 0; });

      svg.selectAll(".node")
            .data(nodes)
              .enter()
                .call (BubbleChartGenerator.create_bubble)

      // Remove unused bubbles
      svg.selectAll(".node")
            .data (nodes)
              .exit ()
                .remove ()

      // Update bubbles
      svg.selectAll(".node")
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .select ("circle")
              .attr ("r", function(d) { return d.r })
              .attr ("title", tooltip_func)
              .style ("fill", function(d) { return color_scale (d.color_value) })

        svg.selectAll(".node")
          .select ("text")
            .attr ("title", tooltip_func)
            .text(function(d) { return d.label_value.substring(0, d.r / 3); });

      // Create detach menu item
      display.create_or_get_menu_item ("detach")
               .attr("href", "javascript:void(0);")
               .attr("onclick", "javascript:open_detached (\"" + chart.detached_url () + "\")")
               .text("Show detached chart window");

      // Generate CSV
      csv_data = csv_from_records (records,
                                   column_info,
                                   ["label_value", "size_value", "color_value"],
                                   [column_label (column_info.columns ["label_value"], true, false, true),
                                    column_label (column_info.columns ["size_value"], true, false, true),
                                    column_label (column_info.columns ["color_value"], true, false, true)],
                                   display.header(). text ());
      if (csv_url != null)
        URL.revokeObjectURL (csv_url);
      csv_blob = new Blob([csv_data], { type: "text/csv" });
      csv_url = URL.createObjectURL(csv_blob);

      display.create_or_get_menu_item ("csv_dl")
               .attr("href", csv_url)
               .attr("download", "gsa_bubble_chart-" + new Date().getTime() + ".csv")
               .text("Download CSV");

      // Generate HTML table
      html_table_data
        = html_table_from_records (records,
                                   column_info,
                                   ["label_value", "size_value", "color_value"],
                                   [column_label (column_info.columns ["label_value"], true, false, true),
                                    column_label (column_info.columns ["size_value"], true, false, true),
                                    column_label (column_info.columns ["color_value"], true, false, true)],
                                   display.header(). text (),
                                   data_src.param ("filter"));
      if (html_table_url != null)
        URL.revokeObjectURL (html_table_url);
      html_table_blob = new Blob([html_table_data], { type: "text/html" });
      html_table_url = URL.createObjectURL(html_table_blob);

      display.create_or_get_menu_item ("html_table")
                  .attr("href", html_table_url)
                  .attr("target", "_blank")
                  .text("Show HTML table");

      // Generate SVG after transition
      setTimeout(function()
                  {
                    svg_data = svg_from_elem (display.svg (),
                                              display.header ().text ());
                    if (svg_url != null)
                      URL.revokeObjectURL (svg_url);
                    svg_blob = new Blob([svg_data], { type: "image/svg+xml" });
                    svg_url = URL.createObjectURL(svg_blob);

                    display.create_or_get_menu_item ("svg_window")
                               .attr("href", "javascript:void(0)")
                               .attr("onclick", "blob_img_window (\"" + svg_url + "\")")
                               .text("Show copyable SVG");

                    display.create_or_get_menu_item ("svg_dl")
                               .attr("href", svg_url)
                               .attr("download", "gsa_bubble_chart-" + new Date().getTime() + ".svg")
                               .text("Download SVG");
                  }, 600);

      display.update_gen_data (my, gen_params);
    };

  var relax_labels = function (labels)
    {
      again = false;
      var labels = svg.selectAll (".slice_label")

      labels.each (function (d, i)
        {
          elem_a = this;

          width_a = elem_a.getComputedTextLength ()
          if (width_a == 0)
            return;

          sel_a = d3.select (elem_a);
          x_a = sel_a.attr ("x");
          y_a = sel_a.attr ("y");


          labels.each (function (d, j)
            {
              elem_b = this;
              if (elem_a == elem_b)
                return;

              width_b = elem_b.getComputedTextLength ()
              if (width_b == 0)
                return;

              sel_b = d3.select(elem_b);
              x_b = sel_b.attr("x");
              y_b = sel_b.attr("y");

              if (Math.abs (x_a - x_b) * 2 > (width_a + width_b))
                return;

              delta_y = y_a - y_b;

              if (Math.abs(delta_y) > label_spacing)
                return;

              again = true;
              var adjust = (delta_y > 0 ? 1 : -1) * 1;
              sel_a.attr ("y", +y_a + adjust);
              sel_b.attr ("y", +y_b - adjust);
            });
        });

      if (again)
        {
          setTimeout (relax_labels, 1)
        }
    }

  return my;

}

BubbleChartGenerator.create_bubble = function ()
{
  var new_node;

  new_node = this.append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })

  new_node
    .append ("circle")
      .attr ("r", function(d) { return d.r })
      .style ("fill", "green")

  new_node
    .append ("text")
    .attr ("text-anchor", "middle")
    .attr ("dominant-baseline", "middle")
    .style ("font-weight", "normal")
    .style ("font-size", "10px")
    .text ("X")
}

function simple_bubble_data (old_data, params)
{
  var label_field = (params && params.label_field) ? params.label_field : "value"
  var size_field = (params && params.size_field) ? params.size_field : "count"
  var color_field = (params && params.color_field) ? params.color_field : "mean"

  var column_info = { group_columns: old_data.column_info.group_columns,
                      data_columns: old_data.column_info.data_columns,
                      columns : {} }

  column_info.columns ["label_value"]
    = {
        name : "label_value",
        type : old_data.column_info.columns [label_field].type,
        column : old_data.column_info.columns [label_field].column,
        stat : old_data.column_info.columns [label_field].stat,
        data_type : old_data.column_info.columns [label_field].data_type,
      }

  column_info.columns ["size_value"]
    = {
        name : "size_value",
        type : old_data.column_info.columns [size_field].type,
        column : old_data.column_info.columns [size_field].column,
        stat : old_data.column_info.columns [size_field].stat,
        data_type : old_data.column_info.columns [size_field].data_type,
      }

  column_info.columns ["color_value"]
    = {
        name : "color_value",
        type : old_data.column_info.columns [color_field].type,
        column : old_data.column_info.columns [color_field].column,
        stat : old_data.column_info.columns [color_field].stat,
        data_type : old_data.column_info.columns [color_field].data_type,
      }

  var bubble_data = [];

  for (var d in old_data.records)
    {
      var new_record = {};

      new_record ["label_value"] = old_data.records [d][label_field];
      new_record ["size_value"] = old_data.records [d][size_field];
      if (color_field)
        new_record ["color_value"] = old_data.records [d][color_field];
      else
        new_record ["color_value"] = null;

      bubble_data.push (new_record);
    }

  var new_data = { original_xml : old_data.original_xml,
                   column_info : column_info,
                   records : bubble_data,
                   filter_info : old_data.filter_info }

  return new_data;
}

