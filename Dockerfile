FROM node:12

RUN \
      npm install -g nrm && \
      nrm use taobao && \
      npm install hexo-cli -g && \
      mkdir /myblog && \
      hexo init /myblog && \
      sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list && \
      apt install git && \
      git clone -b master https://github.com/jerryc127/hexo-theme-butterfly.git /myblog/themes/butterfly && \
      cd /myblog && \
      sed -i 's/theme: landscape/theme: butterfly/g' /myblog/_config.yml && \
      npm i hexo-theme-butterfly && \
      npm install hexo-renderer-pug hexo-renderer-stylus --save && \
      cp /myblog/themes/butterfly/_config.yml /myblog/_config.butterfly.yml

WORKDIR /myblog
EXPOSE 80
CMD [ "hexo","server","-p","80"]
