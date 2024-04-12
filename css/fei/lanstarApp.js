        function secondToDate(second) {
            if (!second) {
                return 0;
            }
            const time = [0, 0, 0, 0, 0];
            if (second >= 365 * 24 * 3600) {
                time[0] = parseInt(second / (365 * 24 * 3600));
                second %= 365 * 24 * 3600;
            }
            if (second >= 24 * 3600) {
                time[1] = parseInt(second / (24 * 3600));
                second %= 24 * 3600;
            }
            if (second >= 3600) {
                time[2] = parseInt(second / 3600);
                second %= 3600;
            }
            if (second >= 60) {
                time[3] = parseInt(second / 60);
                second %= 60;
            }
            if (second > 0) {
                time[4] = second;
            }
            return time;
        }

        function setTime() {
            const startTime = document.getElementById('our-company').getAttribute('data-start');
            let create_time = Math.round(new Date(startTime).getTime() / 1000);
            let timestamp = Math.round((new Date().getTime() + 8 * 60 * 60 * 1000) / 1000);
            let currentTime = secondToDate((timestamp - create_time));
            document.getElementById('our-company').innerHTML = '<span>' + currentTime[0] + '</span>' + '<svg class="icon" aria-hidden="true">\n' +
                '<use xlink:href="#icon-huaban"></use>' +
                '</svg><span>' + currentTime[1] + '</span><svg class="icon" aria-hidden="true">' +
                '<use xlink:href="#icon-tian"></use>' +
                '</svg><span>'
                + currentTime[2] + '</span><svg class="icon" aria-hidden="true">' +
                '<use xlink:href="#icon-shi"></use>' +
                '</svg><span>' + currentTime[3] + '</span><svg class="icon" aria-hidden="true">' +
                '<use xlink:href="#icon-fen"></use>' +
                '</svg><span>' + currentTime[4]
                + '</span><svg class="icon" aria-hidden="true">' +
                '<use xlink:href="#icon-miao"></use>' +
                '</svg>';
        }

        setInterval(setTime, 1000);

