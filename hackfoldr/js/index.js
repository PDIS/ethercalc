// prepare to handle url
var paths = location.pathname.split('/') || [];
var current_iframe_url = paths[2] ? unescape(unescape(paths[2])) : null;
var history_state = {};
// prepare to handle backend data (from ethercalc or google spreadsheet)
var csv_api_source = "/sheet1.csv";
var csv_api_source_type = "ethercalc";
var csv_api_source_id = 'sheet1';
// prepare to accept foldr options set in ethercalc
var hide_sheet = false;
var sort_sheet = true;
// prepare to handle iframe content
var current_foldr_name = "";
var iframe_src;
// user preferences saved in local storage
var foldr_histories = JSON.parse(localStorage.getItem("hackfoldr")) || [];
var foldr_scale = JSON.parse(localStorage.getItem("hackfoldr-scale")) || "";

// let user sort #toc menu by drag and drop, a very user friendly feature suggest by @ipa. using jquery ui sortable. (also, ethercalc only)
var sort_ethercalc = function (sort_initial_row, sort_target_row) {
    $.ajax({
        url: './sheet1.csv',
        contentType: 'text/plain',
        data: 'moveinsert A' + sort_initial_row + ':F' + sort_initial_row + ' A' + sort_target_row,
        type: 'POST',
        processData: false
        // to avoid race condition (ethercalc data is re-compiled before post action is finished), use promise mode on $.ajax and prospond compile action for 1 sec. thanks @audreyt :3 :3
    }).then(function () {
        setTimeout(function () {
            $("#toc .menu").html("");
            compile_ethercalc();
        }, 1000)
    });
}
// for jquery ui sortable
var sort_action = {
    update: function (event, ui) {
        // previously we have assigned each menu item an id attribute while reading csv data. ha!
        var sort_initial_row = ui.item.attr("id");
        // get an array with new item order as array index, and old item row number as array value. using a jquery ui built-in function.
        var new_order = $(this).sortable("toArray");
        // find the old row name of the next sibling of the dragged item.
        var sort_target_neighbor = new_order[$.inArray(sort_initial_row, new_order) + 1]
        // but if item is dragged to bottom, there would be no neighbor. so use the one with largest row number instead.
        if ($.type(sort_target_neighbor) === "undefined") {
            new_order = $.map(new_order, function (value, index) {
                return parseInt(value);
            });
            var sort_target_neighbor_row = Math.max.apply(Math, new_order);
            var sort_target_row = sort_target_neighbor_row + 1;
        } else {
            var sort_target_row = parseInt(sort_target_neighbor);
        }
        // convert row numbers from string to number
        var sort_initial_row = parseInt(sort_initial_row);
        //console.log(sort_initial_row+" to "+(sort_target_row-1));
        sort_ethercalc(sort_initial_row, sort_target_row);
    }
};

// compile sandstorm Ethercalc grain data
var compile_json = function (rows) {
    // at the first beginning, we don't have a foldr title. so we are going to get the title before any other thing happens.
    var got_title = false
    // #toc menu items are at root level by default. if depth == 1, they will be in level 1 submenu, which is wrapped inside an semantic ui accordion
    var depth = 0

    var link_template_source = '<a href="{{url}}" target="{{target}}" id="{{id}}" class="{{type}} item"><i class="icon {{icon}}" data-content="{{subject}}"></i>{{subject}}</a>';
    //var link_template_source ='<a href="{{url}}" target="{{target}}" class="{{type}} item"><i class="icon {{icon}}"></i>{{subject}}</a>';
    var link_template = Handlebars.compile(link_template_source);

    var link_label_template_source = '<div class="ui label {{color}}">{{label}}</div>';
    var link_label_template = Handlebars.compile(link_label_template_source);

    // for link items
    var add_link = function (row_index, row) {

        // prepare to handle link items. these variables will be used with link_template.
        var link_icon = "";
        var link_type = "link";
        var link_url = row[0].trim();
        var link_target = "_blank";

        // automatically assign various of pretty icons for link items
        if (link_url.match(/^.*.hackpad.com\//)) {
            link_icon = "text file outline";
        } else if (link_url.match(/^.*.etherpad.mozilla.org\//)) {
            link_icon = "file outline";
        } else if (link_url.match(/^.*.groups.google.com\//)) {
            link_icon = "users";
        } else if (link_url.match(/^.*.plus.google.com\//)) {
            link_icon = "google plus";
        } else if (link_url.match(/^.*.kktix.cc\//)) {
            link_icon = "bullhorn";
        } else if (link_url.match(/^.*.kktix.com\//)) {
            link_icon = "bullhorn";
        } else if (link_url.match(/^.*.registrano.com\//)) {
            link_icon = "bullhorn";
        } else if (link_url.match(/^.*.docs.google.com\/spreadsheet.*/)) {
            link_icon = "table";
        } else if (link_url.match(/^.*.docs.google.com\/drawings.*/)) {
            link_icon = "photo";
        } else if (link_url.match(/^.*.docs.google.com\/document.*/)) {
            link_icon = "text file";
        } else if (link_url.match(/^.*.docs.google.com\/presentation.*/)) {
            link_icon = "laptop";
        } else if (link_url.match(/^.*.docs.google.com\/form.*/)) {
            link_icon = "unordered list";
        } else if (link_url.match(/^.*.drive.google.com\//)) {
            link_icon = "cloud";
        } else if (link_url.match(/^.*.mapsengine.google.com\//)) {
            link_icon = "map marker";
        } else if (link_url.match(/^.*.www.google.com\/maps\//)) {
            link_icon = "map marker";
        } else if (link_url.match(/^.*.umap.fluv.io\//)) {
            link_icon = "map marker";
        } else if (link_url.match(/^.*.github.com\//)) {
            link_icon = "github";
        } else if (link_url.match(/^.*.moqups.com\//)) {
            link_icon = "photo";
        } else if (link_url.match(/^.*.facebook.com\//)) {
            link_icon = "facebook";
        } else if (link_url.match(/^.*.twitter.com\//)) {
            link_icon = "twitter";
        } else if (link_url.match(/^.*.tumblr.com\//)) {
            link_icon = "tumblr";
        } else if (link_url.match(/^.*.trello.com\//)) {
            link_icon = "trello";
        } else if (link_url.match(/^.*.youtube.com\/embed\//)) {
            link_icon = "youtube play";
        } else if (link_url.match(/^.*.youtube.com\//)) {
            var startPostition = link_url.indexOf('v=') + 2;
            link_url = '//www.youtube.com/embed/' + link_url.substring(startPostition, startPostition + 11);
            link_icon = "youtube play";
        } else if (link_url.match(/^.*.flickr.com\//)) {
            link_icon = "flickr";
        } else if (link_url.match(/^.*.ustream.tv\//)) {
            link_icon = "facetime video";
        } else if (link_url.match(/^.*.www.justin.tv\//)) {
            link_icon = "facetime video";
        } else if (link_url.match(/^.*.www.ptt.cc\/bbs\//)) {
            link_icon = "chat outline";
        } else if (link_url.match(/^.*.disp.cc\//)) {
            link_icon = "chat outline";
        } else if (link_url.match(/^.*.www.google.com\/moderator\//)) {
            link_icon = "chat outline";
        } else if (link_url.match(/^.*.www.loomio.org\//)) {
            link_icon = "chat outline";
        } else if (link_url.match(/^.*.hack.g0v.tw\//)) {
            link_icon = "exchange";
            //link_url = link_url.split("/")[1].toString();
            //link_type = "foldr";
            //link_target = "";
        } else if (link_url.match(/^.*.hack.etblue.tw\//)) {
            link_icon = "exchange";
            //link_url = link_url.split("/")[1].toString();
            //link_type = "foldr";
            //link_target = "";
        } else if (link_url.match(/^.*.hackfoldr.org\//)) {
            link_icon = "exchange";
            //link_url = link_url.split("/")[1].toString();
            //link_type = "foldr";
            //link_target = "";
        } else {
            link_icon = "globe";
        }

        // wrap up link item optinos into a hash
        var context = {
            id: row_index + 1,
            url: link_url,
            subject: row[1],
            icon: link_icon,
            type: link_type,
            target: link_target
        };
        // and send it into the html template (meanwhile, assign it an id for jquery sortable)
        var $link_element = $(link_template(context));

        // parse link labels
        var link_label = row[3].trim();
        var link_label_color = "";

        if (link_label.length > 0) {
            // set up label color
            if (link_label.match(/^gray/) || link_label.match(/:issue/)) {
                link_label_color = "gray";
            } else if (link_label.match(/^deep-blue/)) {
                link_label_color = "deep-blue";
            } else if (link_label.match(/^deep-green/)) {
                link_label_color = "deep-green";
            } else if (link_label.match(/^deep-purple/)) {
                link_label_color = "deep-purple";
            } else if (link_label.match(/^black/)) {
                link_label_color = "black";
            } else if (link_label.match(/^green/)) {
                link_label_color = "green";
            } else if (link_label.match(/^red/) || link_label.match(/:important/)) {
                link_label_color = "red";
            } else if (link_label.match(/^blue/)) {
                link_label_color = "blue";
            } else if (link_label.match(/^orange/)) {
                link_label_color = "orange";
            } else if (link_label.match(/^purple/)) {
                link_label_color = "purple";
            } else if (link_label.match(/^teal/)) {
                link_label_color = "teal";
            } else if (link_label.match(/^yellow/) || link_label.match(/:warning/)) {
                link_label_color = "yellow";
            } else if (link_label.match(/^pink/)) {
                link_label_color = "pink";
            }
            ;
            // set up label content
            link_label = link_label.replace(link_label_color, "").replace("important", "").replace("warning", "").replace("issue", "").replace(":", "").trim();
            // append label to link item
            var label_context = {label: link_label, color: link_label_color};
            var $link_label_element = $(link_label_template(label_context));
            $link_element.find("i.icon").after($link_label_element);
        }

        // append link item to #toc menu
        if (depth == 1) {
            $('#toc .ui.accordion:last').find('.menu').append($link_element);
        } else {
            $('#toc .ui.vertical.menu').append($link_element);
        }
    }

    var accordion_template_source = '<div class="ui accordion"><div id="{{id}}" class="title header item {{mode}}"><i class="icon folder closed"></i><i class="icon folder open hidden" data-content="{{title}}" style="display: none;"></i>{{title}}</div><div class="content ui small sortable menu {{mode}}"></div></div>';
    var accordion_template = Handlebars.compile(accordion_template_source);

    // for foldr items
    var add_accordion = function (row_index, row) {

        if (row[2].match(/expand/)) {
            var foldr_mode = "active";
        } else if (row[2].match(/collapse/)) {
            var foldr_mode = "collapsed-subfoldr";
        } else {
            var foldr_mode = "";
        }

        var context = {title: row[1], id: row_index + 1, mode: foldr_mode};
        var $accordion_el = $(accordion_template(context));

        // append foldr item to #toc menu
        $accordion_el.appendTo('#toc .ui.vertical.menu').accordion();

        // expand foldr item if "expand" is set to its option
        //if(foldr_mode){
        //  $accordion_el.accordion('open',0)
        //}
    }

    // start creating #toc menu
    $.each(rows, function (row_index, row) {

        // prepare column A - D for following actions
        if (!row[0]) {
            row[0] = "";
        }
        if (!row[1]) {
            row[1] = "";
        }
        if (!row[2]) {
            row[2] = "";
        }
        if (!row[3]) {
            row[3] = "";
        }

        row = row.map(function (content) {
            return content.toString();
        });

        // skip comment rows
        if (row[0].match(/^#/) || row[1].match(/^#/) || row[2].match(/^#/) || row[3].match(/^#/)) {
            return
        }

        var this_row_url = row[0].trim();
        var this_row_title = row[1].trim();

        // if column A and B is empty, then skip this row
        if (this_row_url.length === 0 && this_row_title.length === 0) {
            return
        }

        // if anyone of column A and B is not empty, then parse this row
        // if foldr title is not set yet, then the content of first non-empty row would be foldr title
        if (!got_title) {

            if (this_row_title.length > 0) {

                // make the first non-comment content foldr title
                $('#topbar .foldr.title .text').text(this_row_title);
                current_foldr_name = this_row_title;
                got_title = true;

                // detect sheet hide option
                if (row[2].match(/hide/)) {
                    hide_sheet = true;
                }

                // detect sheet sort option
                if (row[2].match(/unsortable/)) {
                    sort_sheet = false;
                }

                // detect title row index, not using
                //new_pad_row_index = row_index+2;

                // save current foldr info
                var current_foldr_history = {
                    foldr_name: this_row_title,
                    foldr_id: 'sheet1'
                };

                // Remove all items in foldr_histories that share the same foldr_id
                foldr_histories = $.grep(foldr_histories, function (value) {
                    return JSON.parse(value).foldr_id !== current_foldr_history.foldr_id;
                });
                // new history on top
                foldr_histories.unshift(JSON.stringify(current_foldr_history));
                // add foldr to history
                localStorage.setItem("hackfoldr", JSON.stringify(foldr_histories));
            } else {
                return
            }

            // TODO: need opt....
            //$.each(row, function(col_index, col){
            //  col = col.trim();
            //  // get the MAGIC title
            //  if(!got_title && col.length > 0) {
            //  }
            //});
        } else {
            // since foldr title is set, start to get links in #toc
            if (this_row_url.length == 0 || this_row_url.match(/^>/)) { // folder
                depth = 1
                add_accordion(row_index, row);
            } else if (this_row_url.match(/^</)) { // end folder
                depth = 0
            } else { // link
                add_link(row_index, row);
                // set initial page title
                if (this_row_url == iframe_src) {
                    if (iframe_src == "edit") {
                        $("title").text("編輯 | " + current_foldr_name + " | hackfoldr");
                    } else {
                        $("title").text(this_row_title + " | " + current_foldr_name + " | hackfoldr");
                    }
                }
            }
        }
    });

    // set initial iframe src attribute
    if (!$("#iframe").attr("src")) {
        if (isCanEdit()) {
            $("#iframe").attr("src", "./sheet1");
        } else {
            $("#iframe").attr("src", "./_viewonly");
        }
    }
    if (!isCanEdit()) {
        $("#topbar .add.to.list").hide();
        $("#topbar .submit.segment").hide();
    }

    // auto new window, and auto new window icon
    var new_window_icon = "<i class='icon forward mail'></i>";
    var open_link_in_new_window_or_not = function () {
        link_url = $(this).attr("href");
        if (link_url.match(/^.*.plus.google.com\//)) {
            return true;
        } else if (link_url.match(/^.*.kktix.cc\//)) {
            return true;
        } else if (link_url.match(/^.*.kktix.com\//)) {
            return true;
        } else if (link_url.match(/^.*.registrano.com\//)) {
            return true;
        } else if (link_url.match(/^.*.github.com\//)) {
            return true;
        } else if (link_url.match(/^.*drive.google.com\/(?!.*\/preview$)/)) {
            return true;
        } else if (link_url.match(/^.*.facebook.com\//)) {
            return true;
        } else if (link_url.match(/^.*.trello.com\//)) {
            return true;
        } else if (link_url.match(/^.*.youtube.com\/playlist.*/)) {
            return true;
            //} else if(link_url.match(/^.*.gov.tw\//)) {
            //  return true;
        } else if (link_url.match(/^.*.www.loomio.org\//)) {
            return true;
        } else if (link_url.match(/^.*.flickr.com\//)) {
            return true;
        } else if (location.protocol == 'https:' && link_url.match(/^http:\/\//)) {
            return true;
        } else {
            return false;
        }
    };
    $("#toc a.link.item").filter(open_link_in_new_window_or_not).attr("target", "_blank").find("i.icon").after(new_window_icon);
    $("#toc a.link.item[target='_blank']").not(":has(i.icon.forward.mail)").find("i.icon").after(new_window_icon);

    // auto highlight active items and expand parent accordion
    var link_is_current_url_or_not = function () {
        link_url = $(this).attr("href");
        if (link_url == iframe_src) {
            return true;
        } else {
            return false;
        }
    };
    $("#toc a.link.item").filter(link_is_current_url_or_not).addClass("active").parent(".content").addClass("active").prev(".header").addClass("active");

    // auto expand #toc accordion when number < 4
    var children_are_less_or_not = function () {
        if ($(this).children().length < 4) {
            return true;
        } else {
            return false;
        }
    };
    $("#toc .ui.accordion .content").filter(children_are_less_or_not).not(".collapsed-subfoldr").addClass("active").prev(".header").addClass("active");

    // change foldr icons for auto activated subfoldrs
    $("#toc .ui.accordion .header.active .icon.folder.closed").hide();
    $("#toc .ui.accordion .header.active .icon.folder.open").show();

    // make #toc sortable on edit page by default
    if (current_iframe_url == "edit") {
        if (csv_api_source_type == "ethercalc") {
            if (sort_sheet) {
                $("#toc .sortable").sortable(sort_action);
            }
        }
    }

    // RO - Don't know why but the 更新 popup does not disappear. So I think it's better to disable it.
    // // enable popup
    // $('i.icon').popup();
}

var initalized = false;
// prepare to load or refresh csv data
var compile_ethercalc = function () {
    // compile ethercalc csv
    $.ajax('./sheet1.csv', {
        success: function(data){
            compile_json(CSV.parse(data));
        },
        error: function(error, textStatus, errorThrown ) {
            if (errorThrown == 'Not Found') {
                if (initalized) {
                    compile_ethercalc();
                } else {
                    post_ethercalc('資料夾標題', '');
                    initalized = true;
                }
            }
        }
    });
};

// load page~
compile_ethercalc();

// activate semantic ui components
$('.ui.dropdown').dropdown();
//$('.ui.checkbox').checkbox();
$('.ui.accordion').accordion();

// for semantic ui css specificity
$(".hidden, .shy").hide();

// sidebar expansion buttons
$("#nav .collapse.button").on("click tap", function () {
    $("#sidebar, #wrapper").addClass("desktop-collapsed-layout").removeClass("desktop-expanded-layout");
    $(".expanded.mode").hide();
    $(".collapsed.mode").not(".tablet.only").show();
});
$("#nav .expand.button").on("click tap", function () {
    $("#sidebar, #wrapper").addClass("desktop-expanded-layout").removeClass("desktop-collapsed-layout");
    $(".expanded.mode").not(".tablet.only").css("display", "");
    $(".collapsed.mode").hide();
});

// sidebar show nav buttons
$("#topbar .hide.nav.button").on("click tap", function () {
    $(".expanded.mode").hide();
    $(".collapsed.mode").not(".desktop.only").show();
    $("#toc").slideToggle();
});
$("#topbar .show.nav.button").on("click tap", function () {
    $(".expanded.mode").not(".desktop.only").not(".ui.segment.submit").css("display", "block");
    $(".collapsed.mode").hide();
    $("#toc").slideToggle();
});

// firefox fix for iframe initial size
$("#wrapper .frame").addClass("normal size");

// zoom in button
$(".frame, #iframe").addClass(foldr_scale + " size");
var set_scale = function (scale) {
    $(".frame, #iframe").removeClass("normal large larger").addClass(scale + " size");
    localStorage.setItem("hackfoldr-scale", JSON.stringify(scale));
};
$("#nav, #topbar").on("click tap", ".zoom.dropdown .normal", function () {
    set_scale("normal");
});
$("#nav, #topbar").on("click tap", ".zoom.dropdown .large", function () {
    set_scale("large");
});
$("#nav, #topbar").on("click tap", ".zoom.dropdown .larger", function () {
    set_scale("larger");
});

// history button
$("#nav .static, #topbar .history").on("click tap", function () {
    $.ajax('./_dump', {
        success: function () {
            window.open('./_published');
        }
    });
    if ($("#sidebar .history .menu").has("a.foldr.item").length == 0) {
        $("#sidebar .history .menu .no.data").show();
    } else {
        $("#sidebar .history .menu .no.data").hide();
    }
});

// refresh table
// load ethercalc data only instead of loading the whole page
$("#topbar .refresh.table").on("click tap", refresh);

function refresh() {
    $("#toc .menu").html("");
    $("#topbar .submit.segment").hide();
    //$("#topbar .submit.segment .error.message").hide();
    compile_ethercalc();
}

// open submit form
$("#topbar .add.to.list").on("click tap", function () {
    $("#topbar .submit.segment").slideToggle();
    // add moretext to defalt input value
    //$.getJSONP('')
});

// choose submit type, add link only (sunflower monster) by default
$("#topbar .submit.segment .checkbox.add.only").on("click tap", function () {
    $("#topbar .form.adding.only.mode").show();
    $("#topbar .form.creating.adding.mode").hide();
    //$("#topbar .form .error.message").hide();
});

$("#topbar .submit.segment .checkbox.add.create").on("click tap", function () {
    $("#topbar .form.adding.only.mode").hide();
    $("#topbar .form.creating.adding.mode").show();
    //$("#topbar .form .error.message").hide();
});

// prepare to post to ethercalc
var post_ethercalc = function (post_title, post_url) {
    $.ajax({
        url: "./_/sheet1",
        type: 'POST',
        contentType: 'text/csv',
        processData: false,
        data: post_url + ',' + post_title,
        success: function () {
            refresh();
        }
    });
};

// create new hackpad and add to foldr
$("#topbar .form .submit.add.create").on("click tap", function () {
    var new_hackpad_title = $("#topbar .form .new.pad.title").val();
    //var new_hackpad_id = encodeURIComponent(new_hackpad_title.slice(0,8));
    var new_hackpad_id = Math.random().toString(36);
    var new_hackpad_url = "https://g0v.hackpad.com/" + new_hackpad_id;
    var new_menu_item = '<a href="' + new_hackpad_url + '" target="_blank" class="link item"><i class="icon text file outline"></i>' + new_hackpad_title + '</a>';
    // add new hackpad info to foldr
    if (new_hackpad_title.length > 0) {
        $('#toc .ui.vertical.menu').append(new_menu_item);
        // post new hackpad info to ethercalc
        post_ethercalc(new_hackpad_title, new_hackpad_url);
    } else {
    }
});

// add a existing url to foldr
$("#topbar .form .submit.add.only").on("click tap", function () {
    var new_link_title = $("#topbar .form .new.link.title").val();
    var new_link_url = $("#topbar .form .new.link.url").val();
    // validate url
    if (/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(new_link_url) && new_link_title.length > 0) {
        $('#toc .ui.vertical.menu').append(
            $('<a />', {href: new_link_url, 'target': '_blank', 'class': 'link item'})
                .text(new_link_title)
                .prepend($('<i class="icon url"></i>'))
        );
        post_ethercalc(new_link_title, new_link_url);
    } else {
    }
});

// semantic ui validation
$('.ui.form')
    .form({
        new_pad_title: {
            identifier: 'new-pad-name',
            rules: [
                {
                    type: 'empty',
                    prompt: '新文件叫什麼名字？'
                }
            ]
        },
        new_link_title: {
            identifier: 'new-link-title',
            rules: [
                {
                    type: 'empty',
                    prompt: '這個網頁叫什麼名字？'
                }
            ]
        },
        new_link_url: {
            identifier: 'new-link-url',
            optional: true,
            rules: [
                {
                    type: 'url',
                    prompt: '網址的格式有問題喔'
                }
            ]
        }
    }).submit(function (e) {
    // Prevent real form submissions,
    // which is triggered by sementic-ui internally (?)
    e.preventDefault();
})
;

// when click on a #nav or #toc link item
$("#sidebar").on("click tap", "a.link.item", function (event) {
    // dynamic url
    var iframe_path = event.target.href;
    if (iframe_path.match(/^https:\/\/.*.hackpad.com\//)) {
        iframe_path = iframe_path.split(/\//).pop();
    }
    // RO - Purge ethercalc.org or some path name
    // history.pushState(history_state,'', '/'+ethercalc_name+'/'+encodeURIComponent(encodeURIComponent(iframe_path))) ;

    // when leaving ethercalc, show edit icon again
    if (event.target.target !== "_blank") {
        // reset page title
        $("title").text(
            $(this).contents().filter(function () {
                return this.nodeType == 3;
            })[0].nodeValue + " | " + current_foldr_name + " | hackfoldr"
        );
    }

    // disable sortable
    //if($("#toc .vertical.menu, #toc .vertical.menu .menu").hasClass("sortable")){
    //  $(this).removeClass("sortable").sortable("destroy");
    //}

    // for mobile: set toc default display (hidden)
    $("#toc").css("display", "");
    $("#topbar .hide.nav.button").hide();
    $("#topbar .show.nav.button").css("display", "");
    $("#topbar .submit.segment").hide();
});

// activate link on click
$("#toc").on("click tap", "a.link.item", function () {
    $("#toc a.link.item").removeClass("active");
    $(this).addClass("active");
});

// toggle folder icons on click
$("#toc").on("click tap", ".header.item", function () {
    $(this).find('.icon.folder').toggle();
});

function isCanEdit() {
    if (typeof READ_ONLY === 'undefined') return true;
    return !READ_ONLY;
}
