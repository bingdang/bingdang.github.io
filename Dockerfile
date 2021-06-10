FROM node:12

RUN \
      npm install hexo-cli -g && \
      mkdir /myblog && \
      hexo init /myblog && \
      sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list

WORKDIR /myblog
EXPOSE 80
CMD [ "hexo","server","-p","80"]
