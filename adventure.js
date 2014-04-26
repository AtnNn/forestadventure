var console = {log:function(){}};

var cheat = 0 - - window.location.search.substr(1);

var delay = 50;

var herospeed = 7;
var lockcenter = false;

var enemies = [];
var level = false;
var hero = false;

var success = false;

//        38
// 32  37 40 39

var go_left = false;
var go_up = false;
var go_right = false;
var attack = false;

var next_id = 0;

function unique_id(){ return next_id++; }

function Creature(name, walk, attack){
  this.name = name;
  if(walk && walk.constructor && walk.constructor.name == 'Function'){
    this.automove = walk;
  }else{
    this.walkspeed = walk == undefined ? 7 : walk;
    this.attackspeed = attack ==undefined ? 7 : attack;
    this.automove = false;
  }
}

function Thing(level, creature, state, pos, center, hitpoints){

  this.image = function(){
    var ret = 'static/images/' + this.creature.name + '-' + this.getstate();
    if(this.faceleft)
      ret += '-flip';
    ret += '.png';
    return ret;
  };

  this.size = function(){
    var size = sizes[this.creature.name + '-' + this.currentstate];
    if(!size){
      //alert('no size for ' + this.creature.name + '-' + this.currentstate);
      return [1000,1000];
    }
    return size;
  };

  this.getstate = function(){
    for(var i = this.state.length; i >= 0; i--){
      if(this.state[i])
        return this.state[i];
    }
  };

  this.setstate = function(state, prio){
    this.state[prio || 0] = state;
    var newstate = this.getstate();
    if(this.currentstate != newstate){
      console.log("change state",this.creature.name,newstate,this.pos.x,this.pos.y,this.yspeed); 
      this.currentstate = newstate;
      this.update();
    }
  };

  // this function is called every time the image changes
  this.update = function(){
    var size = this.size();
    var yoffset = (size[1] - this.oldheight);
    this.pos.y -= yoffset;
    if(!this.center){
      var xoffset = (size[0] - this.oldwidth)/2;
      this.pos.x -= xoffset;
    }else{
      var xoffset = size[0] - this.oldwidth;
      this.pos.x += this.faceleft ? -xoffset : 0;
    };
    this.css({
               'background-image': 'url(' + this.image() + ')',
               width: size[0],
               height: size[1],
               left: this.pos.x,
               top: this.pos.y
             });
    this.oldwidth = size[0];
    this.oldheight = size[1];
  };

  this.css = function(style){
    var it = this.div();
    return it.css.apply(it, arguments);
  };

  this.div = function(){
    return $('#'+this.id);
  };

  this.move = function(x, y){
    if(this.yspeed){
      y = (y || 0) + (delay/50) * this.yspeed;
    }
    
    var newx = this.pos.x + (x || 0);
    var newy = this.pos.y + (y || 0);
    var xsize = this.size()[0];
    if(this.center){
      if(newx < 0) newx = 0;
      if(newx > this.level.width - xsize) newx = this.level.width - xsize;
    }


    var width_height = this.size();
    var width = width_height[0];
    var height = width_height[1];
    var cx = newx + width/2;
    var floor = 600 - this.level.at(cx) - height;

    if(newy >= 599-this.size()[1] && this.level.at(cx) == 0){
      if(this.currentstate != 'dead'){
        this.die();
      }
    }else if(newy == floor || (this.center && newy - 1 == floor)){
      this.yspeed = 0;
      this.pos.y = floor;
      this.pos.x = newx;
      this.setstate(false, 1); 
    }else if(newy > floor && this.yspeed == 0){
      this.setstate(false, 1);
    }else if(newy > floor && this.yspeed < 0){
      this.pos.y = newy;
    }else if(newy > floor){
      this.pos.y = floor;
      this.yspeed = 0;
      this.pos.x = newx;
      this.setstate(false, 1);
    }else{
      this.pos.y = newy;
      this.pos.x = newx;
      this.yspeed += 3;
    }

    if(x || y){
      this.css({
                 left: Math.floor(this.pos.x),
                 top: Math.floor(this.pos.y)
               });
      if(this.center)
        this.level.center(this);
    }
  };

  this.face = function(where){
    var fl = this.faceleft;
    if(where == 'left')
      this.faceleft = true;
    else
      this.faceleft = false;
    if(fl != this.faceleft)
      this.update();
  };

  this.herodistance = function(){
    var width = this.size()[0];
    var x = this.level.hero.pos.x + this.level.hero.size()[0]/2;
    var d = x - this.pos.x - width/2;
    return this.faceleft ? -d : d;
  };

  this.automove = creature.automove || function(){
    if(this.getstate() == 'dead') return;
    var width = this.size()[0];
    var attacking = false;

    if(this.level.hero){
      var hd = this.herodistance();
      if(hd >= 0 && hd <= 300){
        attacking = true;
      }
    }
    var dx = this.faceleft ? -1 : 1;
    if(attacking) dx *= this.creature.attackspeed;
    else dx *= this.creature.walkspeed;
    var cur = this.level.at(this.pos.x+width/2);
    var newh = this.level.at(this.pos.x + dx + width/2);
    if(cur == newh){
      this.move(dx);
      this.setstate(attacking ? 'attack' : 'walking');
      if(this.collision(this.level.hero)){
        if(attacking){
          if(this.level.hero.getstate() != 'dead')
            this.level.hero.die();
        }else if(this.level.hero.getstate() == 'attack')
        this.die();
      }
    }else{
      this.faceleft = this.faceleft ? false : true;
      this.update();
      this.move();
    }
  };
  
  this.canjump = function(){
    if(this.yspeed)
      return false;
    if(this.level.at(this.pos.x+this.size()[0]/2) == 600 - this.size()[1] - this.pos.y)
      return true;
    return false;
  };

  this.collision = function(other){
    return ((other.pos.x < this.pos.x && this.pos.x - other.pos.x < other.size()[0])
            || (other.pos.x >= this.pos.x && other.pos.x - this.pos.x < this.size()[0]))
      &&     other.pos.y + other.size()[1] > this.pos.y
      &&     other.pos.y < this.pos.y + this.size()[1];
  };
  
  this.die = function(){
    this.setstate('dead', this.center ? 3 : 0);
    this.hitpoints --;
    var self = this;
    if(this.center){
      setTimeout(function(){self.restart();}, 3000);
    }else if(this.hitpoints){
      setTimeout(function(){
                   self.setstate('walking');
                 }, 1000);
    }
  };

  this.restart = function(){
    this.pos.x = this.initpos.x;
    this.pos.y = this.initpos.y;
    this.setstate(false,3);
  };

  this.creature = creature;
  this.faceleft = false;
  this.state = state;
  this.pos = new Point(0,0);
  this.currentstate = this.getstate();
  this.id = 'thing' + unique_id();
  this.level = level;
  this.yspeed = 0;
  this.center = center || false;
  this.frame = 0;
  this.oldwidth = 0;
  this.oldheight = 0;
  this.initpos = new Point(pos.x, pos.y);
  this.hitpoints = hitpoints || 1;


  $('#'+level.id).prepend($('<div id="'+this.id+'">'));
  this.update();
  this.move(pos.x, pos.y);
}

function Point(x, y){
  this.x = x;
  this.y = y;
}

function Level(name, ground){

  this.at = function(x){
    var self = this;
    var ret = 0;
    $.each(this.ground, function(i, e){
             if(x >= e[0] && x < e[1]){
               ret = e[2];
               return false;
             }
           });
    return ret;
  };

  this.targetcenter = 400;
  this.curcenter = 400;
  this.center = function(hero){
    var x = hero.pos.x + (hero.faceleft ? hero.size()[0] - 200 : 200);

    if(x < 400) x = 400;
    if(x > this.width - 400) x = this.width - 400;

    this.targetcenter = x;
  };

  this.adjustcenter = function(){
    if(lockcenter) return;
    var delta = 20;
    if(this.targetcenter != this.curcenter){
      if(Math.abs(this.targetcenter - level.curcenter) < delta){
        this.curcenter = this.targetcenter;
      }else{
        this.curcenter += (this.targetcenter < this.curcenter ? -delta : delta);
      }
      $('#'+this.id).css({left: -this.curcenter + 400});
    }
  };

  this.name = name;
  this.ground = ground;
  this.width = sizes['map-' + name][0];
  this.id = 'level' + unique_id();
  this.lastcenter = 0;

  $('#game').html('<div id="'+this.id+'">');

  $('#'+this.id).css({'background-image': 'url(static/images/map-'+this.name+'.png)', width:this.width, height:sizes['map-'+name][1]});

  var self = this;

}

var hero1 = new Creature('hero1');
var hero2 = new Creature('hero2');
var chickencow = new Creature('chickencow', 3, 6);
var witch = new Creature('witch', 4, 1);
var squirrelfish = new Creature('squirrelfish', 4, 9);
var hero3 = new Creature('hero3');
var plant = new Creature('plant', 0, 6);
var murderer = new Creature('murderer');

var dragon =
  new Creature('dragon',
               function(){
                 if(this.hitpoints == 0) return; 

                 this.frame = (this.frame + 1) % 120;

                 var hd = this.herodistance();

                 if(this.collision(this.level.hero) && this.dragon_state != 'hidden'){
                   if(/attack/.test(this.getstate())){
                     if(this.level.hero.currentstate != 'dead'){
                       this.level.hero.die();
                     }
                     var self = this;
                     lockcenter = false;
                     setTimeout(function(){
                                  self.dragon_state = 'hidden';
                                  self.setstate('hidden');
                                  self.pos = {x:0,y:0};
                                },3000);
                   }else if(this.level.hero.getstate() == 'attack'
                            && this.dragon_state == 'normal'
                            && hd < 0){
                     this.hitpoints --;
                     if(this.hitpoints != 0){
                       this.dragon_state = 'flee';
                       this.xspeed += 2;
                       herospeed += 1;
                       this.setstate('morph');
                     }else{
                       this.setstate('dead');
                       return;
                     }
                   }
                 }

                 //950, 1250, 1550

                 switch(this.dragon_state){
                 case 'hidden':
                   if(this.level.hero.pos.x + this.level.hero.size()[0] + 5 > this.level.width){
                     lockcenter = true;
                     this.dragon_state = 'fly';
                     this.direction = 1;
                     console.log("dragon state",this.dragon_state);
                     this.faceleft = false;
                     this.setstate('fly');
                     this.pos.x = 600;
                     this.pos.y = 0;
                   }
                   break;
                 case 'fly':
                   if(this.pos.y + this.size()[1] >= 410 && !this.flyhigh){
                     this.dragon_state = 'drop';
                     this.yspeed = -10;
                     this.setstate('attack2');
                     console.log("dragon state",this.dragon_state);
                     var x = this.pos.x + this.size()[0]/2;
                     this.destination = x < 1100 ? 1250 : x < 1400 ? 950 : 1550;
                   }else{
                     if(this.flyhigh && this.pos.y < 0){
                       this.flyhigh = false;
                     }
                     this.move(this.direction * this.xspeed);
                     if(this.pos.x + this.size()[0] >= this.level.width){
                       this.direction = -1;
                     }
                     if(this.pos.x < this.level.width - 900){
                       this.direction = 1;
                     }
                     if(this.yspeed > 12){
                       this.yspeed = this.flyhigh ? -30 : -10;
                     }
                     this.face((hd < 0) ^ this.faceleft ? 'left' : 'right');
                     this.setstate((this.frame % 15) < 5 ? 'fly' : 'attack1'); 
                   }
                   break;
                 case 'drop':
                   var x = this.pos.x + this.size()[0]/2;
                   if(this.pos.y + this.size()[1] > 545 && Math.abs(x - this.destination) < 5){
                     this.dragon_state = 'attack';
                     console.log("dragon state",this.dragon_state);
                     this.setstate('attack3');
                   }else{
                     console.log("posx", x - this.destination);
                     this.face((hd < 0) ^ this.faceleft ? 'left' : 'right');
                     this.move((this.destination - x) / 5);
                   }
                   break;
                 case 'attack':
                   var x = this.pos.x + this.size()[0]/2;
                   if(Math.abs(x - this.destination) > 120 ){
                     this.dragon_state = 'normal';
                     console.log("dragon state",this.dragon_state);
                     this.setstate('normal');
                     this.face(this.faceleft ? 'right' : 'left');
                   }else{
                     this.move(this.faceleft ? -7 : 7);
                   }
                   break;
                 case 'normal':
                   var x = this.pos.x + this.size()[0]/2;
                   if(Math.abs(x - this.destination) < 100){
                     this.dragon_state = 'fly';
                     this.yspeed = -30;
                     console.log("dragon state",this.dragon_state);
                     this.direction = this.faceleft ? -1 : 1;
                     this.flyhigh = true;
                   }else{
                     this.move(this.faceleft ? -2 : 2);
                   }
                   break;
                 case 'flee':
                   if(hd < -600){
                     this.dragon_state = 'fly';
                     this.yspeed = -30;
                     console.log("dragon state",this.dragon_state);
                     this.direction = this.faceleft ? -1 : 1;
                     this.flyhigh = true;
                   }else{
                     this.move(this.faceleft ? -20 : 20);
                     this.yspeed = 0;
                   }
                   break;
                 default:
                   this.dragon_state = 'hidden';
                 }
              });

var fish = new Creature('fish', function(){
                          
                          if(this.hitpoints == 0) return;
                          var width = this.size()[0];
                          
                          if(/attack/.test(this.getstate())){
                            if(this.collision(this.level.hero) && this.level.hero.currentstate != 'dead'){
                              this.level.hero.die();
                            }
                          }else if(this.level.hero.getstate() == 'attack' && this.fish_state != 0){
                            if(this.collision(this.level.hero)){
                              this.fish_state = 99;
                              this.die();
                            }
                          }

                          switch(this.fish_state || 0){
                          case 0:
                            var hd = this.herodistance();
                            if(hd > 200 && hd < 300 && this.pos.x > 700){
                              this.fish_state = 1;
                              this.yspeed = -20;
                              this.setstate('attack-up');
                            }else{
                              var x = this.pos.x;
                              this.move(- this.faceleft*20 + 10);
                              this.yspeed = 0;
                              if(this.pos.x < 100){
                                this.pos.x = 100;
                                this.faceleft = false;
                                this.update();
                              }else if(this.pos.x + this.size()[0] > this.level.width){
                                this.face('left');
                              }else if(this.pos.x == x){
                                this.faceleft = !this.faceleft;
                                this.update();
                              }
                            }
                            break;
                          case 1:
                            if(this.yspeed > 0){
                              this.fish_state = 2;
                              this.setstate('attack-down');
                            }
                            this.move(-this.faceleft * 30 + 15);
                            break;
                          case 2:
                            if(this.yspeed == 0){
                              this.yspeed = -8;
                              this.faceleft = this.level.hero.pos.x < this.pos.x;
                              this.setstate('attack');
                              var self = this;
                              self.fish_state = 3;
                              setTimeout(function(){
                                           if(self.fish_state != 3){ return; }
                                           self.faceleft ^= true;
                                           self.setstate('walking');
                                           setTimeout(function(){
                                                        if(self.hitpoints){
                                                          self.setstate('swim');
                                                          self.pos.y = 300;
                                                          self.pos.x = self.level.hero.pos > 750 ? 0 : 1500;
                                                          self.update();
                                                          self.fish_state = 0;
                                                        }
                                                      }, 3000);
                                         }, 1500);
                            }
                            this.move(this.faceleft ? - 25 : 25);
                            break;
                          case 3:
                            var dx = this.faceleft ? -3 : 3;
                            this.move(dx);
                            break;
                          case 99:
                            if(this.getstate() == 'walking'){
                              this.setstate('swim');
                              this.pos.y = 300;
                              this.update();
                              this.fish_state = 0;
                            }
                            break;
                          default:
                            this.fish_state = 0;
                          }
                        });
var baby = new Creature('baby', 8, 9);

function loadlevel(n){
  
  go_up = go_left = go_right = attack = false;

  switch(n){
  case 1:
    level = new Level(1,[[0,362,55],[362,444,105],[444,560,60],[560,614,0], [614,845,60], [845,922,82],
                         [922,954,0], [954,1010,82], [1010,1408,56], [1408,1450,84], [1450,1496,138], [1496,1548,184]]);
    
    hero = new Thing(level, hero1, ['normal', false, false, false], new Point(100,400), true, 0);
    
    level.hero = hero;
    
    var chickencow1 = new Thing(level, chickencow, ['walking'], new Point(630, 300));
    var squirrelfish1 = new Thing(level, squirrelfish, ['walking'], new Point(1050, 300));
    var witch1 = new Thing(level, witch, ['walking'], new Point(1250, 500), false, 2);
    
    enemies = [chickencow1, squirrelfish1, witch1];
    
    break;
  case 2:

          level = new Level(2,[[0,400,101],[400,1451,100],[1451,1551,99]]);
          hero = new Thing(level, hero2, ['normal', false, false, false], new Point(100,200), true, hero.hitpoints);

          level.hero = hero;


          var fish1 = new Thing(level, fish, ['swim'], new Point(1200, 300), false, 4);

          var plant1 = new Thing(level, plant, ['walking'], new Point(500, 400));
          var plant2 = new Thing(level, plant, ['walking'], new Point(650, 400));
          plant2.faceleft = true;
          var plant3 = new Thing(level, plant, ['walking'], new Point(800, 400));
          plant3.faceleft = true;
          var plant4 = new Thing(level, plant, ['walking'], new Point(1100, 400), false, 2);
          var plant5 = new Thing(level, plant, ['walking'], new Point(1300, 400), false, 2);
          plant5.faceleft = true;
          var murderer1 = new Thing(level, murderer, ['walking'], new Point(1000, 400), false, 2);
          var murderer2 = new Thing(level, murderer, ['walking'], new Point(550, 400), false, 2);
          murderer2.faceleft = true;
          enemies = [plant1, plant2, plant3, plant4, plant5, murderer1, murderer2, fish1];
    
    break;
  case 3:

          level = new Level(3, [[0,206,38], [206,296,75], [296, 327, 0], [327,405,125], [405,438,0], [438,516,175], [516,560, 0], [560, 1642, 50]]);
          hero = new Thing(level, hero3, ['normal', false, false, false], new Point(0,200), true, hero.hitpoints);
          level.hero = hero;

          var baby1 = new Thing(level, baby, ['walking'], new Point(210, 300));
          var baby2 = new Thing(level, baby, ['walking'], new Point(330, 300));
          var baby3 = new Thing(level, baby, ['walking'], new Point(440, 300));
          var dragon1 = new Thing(level, dragon, ['hidden'], new Point(0, 0), false, 4);
    dragon1.xspeed = 10;

          enemies = [baby1, baby2, baby3, dragon1];

    break;
    default:
      success = true;
      var info = "";
      if(hero && !cheat){
        var hero_name = prompt('Congratulations! You have won the game. What is your name?');
        var deaths = -(hero.hitpoints - 1);
        if(hero_name){
          info = '?name=' + escape(hero_name) + '&deaths=' + escape(deaths);
        }
      }
      document.location.href = "win.php" + info;
  }

  go_up = go_left = go_right = attack = false;

  $('#game').append($('<div id="deaths"></div>'));
}

function preload_images(){
  $.each(sizes, function(k,v){
           $(document).append($('<img src="static/images/"' + k + '.png" style="display:none"/>'));
           $(document).append($('<img src="static/images/"' + k + '-flip.png" style="display:none"/>'));
         });
}

$(function(){

    function bindkeys(){
      $(document).bind('keydown', function(ev){
                         switch(ev.which){
                         case 37: go_left = true; hero.setstate('walking',0); hero.face('left'); break;
                         case 38: if(hero.canjump()){ go_up = true; hero.setstate('jump', 1); } break;
                         case 39: go_right = true; hero.setstate('walking', 0); hero.face('right');  break;
                         case 32:
                           attack = true;
                           hero.setstate('attack', 2);
                           break;
                         }
                         return false;
                       });
      
      
      $(document).bind('keyup', function(ev){
                         switch(ev.which){
                         case 37: go_left = false; hero.setstate('normal'); break;
                         case 38: go_up = false; break;
                         case 39: go_right = false; hero.setstate('normal'); break;
                         case 32:
                           attack = false;
                           hero.setstate(false, 2);
                           break;
                         }
                         return false;
                       });

    }

    bindkeys();

    function tick(){

      var x = 0;
      var y = 0;

      if(hero.currentstate != 'dead'){
        if(go_left){
          x -= herospeed;
        }
        if(go_right){
          x += herospeed;
        }
        if(go_up){
          hero.yspeed = -32;
          go_up = false;
        }
      }


      hero.move(x, y);

      var alive = enemies.length;

      $.each(enemies, function(){
               this.automove();
               if(this.hitpoints == 0)
                 alive--;
             });

      if((!alive && hero.pos.x + hero.size()[0] == level.width)){
        loadlevel(level.name + 1);
      }

      level.adjustcenter();
      
      $('#deaths').text(1 - hero.hitpoints);

      if(!success)
        setTimeout(tick, delay);
    }
    
    loadlevel(cheat ? cheat : 1);

    preload_images();

    

    tick();
  

  });