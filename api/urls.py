from django.urls import re_path, include
from django.contrib import admin
from api import rponto, views

app_name="api" 

urlpatterns = [
    
   re_path(r'^rponto/sql/$',rponto.Sql),
   re_path(r'^rponto/sqlp/$',rponto.SqlProtected),
   re_path(r'^rponto/sync/$',rponto.Sync),
   re_path(r'^rponto/preprocessimages/$',rponto.PreProcessImages),
   re_path(r'^rponto/simulate/$',rponto.SimulateRecordAdd),
   re_path(r'^rponto/excel/$',rponto.ExportRegistosExcel),
   re_path(r'^rponto/justificacao/upload/$', rponto.UploadJustificacaoPDF),
   re_path(r'^rponto/justificacao/pdf/(?P<justificacao_id>\d+)/$', rponto.DownloadJustificacaoPDF),
   re_path(r'^rponto/processamento/export/$', rponto.ExportProcessamentoExcel),
   re_path(r'^password-reset/lookup/$',  views.password_reset_lookup),
   re_path(r'^password-reset/confirm/$', views.password_reset_confirm),
]