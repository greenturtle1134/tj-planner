$(function(){
    $.getJSON("static/data/courses.json", function (data) {
        courses = data;
        $.getJSON("static/data/labs.json", function (data) {
            labs = data;
            $.getJSON("static/data/defaults.json", function (data) {
                defaults = data
                
                if (typeof(Storage) !== "undefined") {
                    let saved = localStorage.getItem("autosaved");
                    if (saved) {
                        loadString(saved);
                    }
                    else {
                        loadJSON(defaults.states.minimal);
                    }
                }
                else {
                    loadJSON(defaults.states.minimal);
                }

                let hints = defaults.hints;
                for (let i = 0; i < hints.length; i++) {
                    let item = hints[i];
                    $("#" + getBoxId(item.row, item.col)).append("<div class=\"m-auto grid__hint text-secondary\">" + item.text + "</div>");
                }

                onUpdate();
            });
        });
    });
});

function kebab(string) {
    return string.toLowerCase().replace(/ /g, "_");
}

function getCourseNameString(course) {
    return "(" + course.num + ") " + course.full_name;
}

function getBoxId(r, c) {
    if(r == 0) {
        r = "s";
    }
    else if (r == 8) {
        r = "o";
    }
    return "cell-" + r + "-" + c;
}

counter = 0;

function createCourseDraggable(course) {
    counter++;

    var $course = $("<div>", {
        id: "c" + counter,
        "class": "course p-1",
        "draggable": "true",
        "ondragstart": "dragStart(event)",
        "data-course-id": course.id,
        "data-course-credit": course.equivalent
    });

    $course.append("<span class=\"course__status\"><abbr title=\"Loading prerequisites\"><i class=\"fas fa-spinner\"></i></abbr></span>");
    $course.append(course.short_name);

    if (course.semester) {
        $course.addClass("course--semester");
    } else {
        $course.addClass("course--year");
    }

    if (course.ap === "ap") {
        $course.addClass("course--ap");
    }
    else if (course.ap === "post") {
        $course.addClass("course--post-ap");
    }
    else {
        $course.addClass("course--pre-ap");
    }

    $course.addClass("course--"+kebab(course.category));

    return $course;
}
